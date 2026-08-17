'use client';

import React from 'react';
import { getExerciseVideoUrl } from '@/lib/exercise-media';

/**
 * Exercise reference visual.
 *
 * If a drill has a real `videoUrl`, we play that directly. Otherwise we
 * render a lightweight, fully self-contained animated SVG loop that
 * demonstrates the general motion pattern for that category of exercise.
 * This is deliberately NOT presented as real footage — it's a schematic
 * motion guide, labelled as such, so nothing here overstates what it is.
 * It needs no network access and can never show a broken video.
 */

export type MotionCategory =
    | 'punch'
    | 'push'
    | 'core'
    | 'pull'
    | 'legs'
    | 'cardio'
    | 'stretch'
    | 'default';

const CATEGORY_KEYWORDS: Array<[MotionCategory, RegExp]> = [
    ['punch', /jab|cross|hook|uppercut|shadowbox|slip|roll|pivot|bob|weave|combo|punch/i],
    ['cardio', /knee strike|sprint|jump rope|blitz|kick|teep|sprawl|cardio|burpee/i],
    ['push', /pushup|push-up|push up|pike|dip|press/i],
    ['pull', /superman|snow angel|bird-dog|bird dog|back extension|row|pull/i],
    ['core', /situp|sit-up|crunch|leg raise|hollow|mountain climber|plank|core/i],
    ['legs', /squat|lunge|calf raise|glute bridge|wall sit|leg/i],
    ['stretch', /stretch|mobility|breathe|recovery|reset/i],
];

export function detectMotionCategory(name: string, instruction?: string): MotionCategory {
    const haystack = `${name} ${instruction || ''}`;
    for (const [category, pattern] of CATEGORY_KEYWORDS) {
        if (pattern.test(haystack)) return category;
    }
    return 'default';
}

const TARGET_MUSCLE_BY_CATEGORY: Record<MotionCategory, string> = {
    punch: 'Shoulders, Core & Reflexes',
    push: 'Chest, Shoulders & Triceps',
    core: 'Abdominals & Core Stability',
    pull: 'Back & Posterior Chain',
    legs: 'Quads, Glutes & Calves',
    cardio: 'Full-Body Conditioning',
    stretch: 'Mobility & Recovery',
    default: 'Full-Body',
};

export function getTargetMuscle(name: string, instruction?: string): string {
    const category = detectMotionCategory(name, instruction);
    return TARGET_MUSCLE_BY_CATEGORY[category];
}

function MotionFigure({ category }: { category: MotionCategory }) {
    // A shared abstract figure (head + torso + two limbs). Only the transform
    // animations differ per category, keeping this compact.
    const limbColor = '#e2ff3b';
    const bodyColor = 'rgba(255,255,255,0.65)';

    const renderLimbs = () => {
        switch (category) {
            case 'punch':
                return (
                    <>
                        <line x1="100" y1="95" x2="60" y2="95" stroke={limbColor} strokeWidth="6" strokeLinecap="round">
                            <animate attributeName="x2" values="60;140;60" dur="0.9s" repeatCount="indefinite" />
                        </line>
                        <line x1="100" y1="110" x2="60" y2="110" stroke={limbColor} strokeWidth="6" strokeLinecap="round" opacity="0.6">
                            <animate attributeName="x2" values="140;60;140" dur="0.9s" repeatCount="indefinite" />
                        </line>
                    </>
                );
            case 'push':
                return (
                    <g>
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,14; 0,0" dur="1.6s" repeatCount="indefinite" />
                        <line x1="70" y1="130" x2="130" y2="130" stroke={limbColor} strokeWidth="6" strokeLinecap="round" />
                    </g>
                );
            case 'pull':
                return (
                    <>
                        <line x1="100" y1="100" x2="55" y2="80" stroke={limbColor} strokeWidth="6" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" values="0 100 100; -25 100 100; 0 100 100" dur="1.4s" repeatCount="indefinite" />
                        </line>
                        <line x1="100" y1="100" x2="145" y2="80" stroke={limbColor} strokeWidth="6" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" values="0 100 100; 25 100 100; 0 100 100" dur="1.4s" repeatCount="indefinite" />
                        </line>
                    </>
                );
            case 'core':
                return (
                    <g>
                        <animateTransform attributeName="transform" type="scale" values="1,1; 1,0.9; 1,1" dur="1.3s" repeatCount="indefinite" additive="sum" />
                        <line x1="80" y1="140" x2="120" y2="140" stroke={limbColor} strokeWidth="6" strokeLinecap="round" />
                    </g>
                );
            case 'legs':
                return (
                    <g>
                        <animateTransform attributeName="transform" type="translate" values="0,0; 0,18; 0,0" dur="1.5s" repeatCount="indefinite" />
                        <line x1="85" y1="150" x2="80" y2="180" stroke={limbColor} strokeWidth="7" strokeLinecap="round" />
                        <line x1="115" y1="150" x2="120" y2="180" stroke={limbColor} strokeWidth="7" strokeLinecap="round" />
                    </g>
                );
            case 'cardio':
                return (
                    <line x1="100" y1="150" x2="130" y2="180" stroke={limbColor} strokeWidth="7" strokeLinecap="round">
                        <animateTransform attributeName="transform" type="rotate" values="0 100 150; -35 100 150; 0 100 150" dur="0.8s" repeatCount="indefinite" />
                    </line>
                );
            default:
                return null;
        }
    };

    return (
        <svg viewBox="0 0 200 220" className="w-32 h-32 md:w-40 md:h-40" style={{ filter: 'drop-shadow(0 0 12px rgba(226,255,59,0.25))' }}>
            <circle cx="100" cy="55" r="18" fill="none" stroke={bodyColor} strokeWidth="4">
                {category === 'default' && (
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                )}
            </circle>
            <line x1="100" y1="73" x2="100" y2="150" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" />
            {renderLimbs()}
        </svg>
    );
}

interface ExerciseVisualGuideProps {
    name: string;
    instruction?: string;
    videoUrl?: string;
    expanded?: boolean;
}

export function ExerciseVisualGuide({ name, instruction, videoUrl, expanded = false }: ExerciseVisualGuideProps) {
    const category = detectMotionCategory(name, instruction);
    const resolvedVideoUrl = videoUrl || getExerciseVideoUrl(name);

    if (resolvedVideoUrl) {
        return (
            <div className="w-full h-full bg-black flex items-center justify-center">
                <video
                    src={resolvedVideoUrl}
                    // object-contain (not object-cover) is deliberate: our
                    // reference footage is full-body, mostly portrait-oriented
                    // shots, while these containers are wide/square cards.
                    // object-cover crops whatever overflows the container's
                    // aspect ratio, which was cutting the fighter's head
                    // and/or feet off — sometimes cropping out the exercise
                    // itself. object-contain scales the whole frame to fit
                    // inside the container instead, letterboxing on the
                    // sides rather than cropping top/bottom, so the full
                    // movement is always visible regardless of the
                    // container's shape.
                    className="w-full h-full object-contain"
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-black/40 to-black/80 ${expanded ? 'py-12' : ''}`}>
            <MotionFigure category={category} />
            {!resolvedVideoUrl && (
                <span className="text-[8px] font-black text-white/25 uppercase tracking-widest mt-2">
                    Animated Form Guide
                </span>
            )}
        </div>
    );
}