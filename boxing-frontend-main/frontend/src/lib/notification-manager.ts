export const NotificationManager = {
    checkInterval: null as any,

    init() {
        if (typeof window === 'undefined') return;
        console.log("Initializing Neural Notification System...");
        this.requestPermission();
        this.startMonitoring();
    },

    async requestPermission() {
        if (typeof window === 'undefined') return;
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === "default") {
            await Notification.requestPermission();
        }
    },

    startMonitoring() {
        if (typeof window === 'undefined') return;
        if (this.checkInterval) clearInterval(this.checkInterval);

        this.checkInterval = setInterval(() => this.checkSchedules(), 60000);
        this.checkSchedules(); // Initial check
    },

    checkSchedules() {
        if (typeof window === 'undefined') return;
        const storedPlan = localStorage.getItem('active_boxing_plan_v2');
        if (!storedPlan) return;

        try {
            const plan = JSON.parse(storedPlan);
            if (!plan || !plan.days) return;
            const today = new Date();
            const dateStr = today.getDate().toString();

            const todayPlan = plan.days.find((d: any) => 
                d.date === dateStr || 
                (d.day_name && d.day_name.toUpperCase() === today.toLocaleString('en-us', { weekday: 'short' }).toUpperCase())
            );

            if (!todayPlan || !todayPlan.protocol) return;

            todayPlan.protocol.forEach((session: any, index: number) => {
                if (this.isTimeToNotify(session.time)) {
                    this.triggerNotification(session, index);
                }
            });
        } catch (e) {
            console.error('Failed to check notification schedules:', e);
        }
    },

    isTimeToNotify(timeStr: string): boolean {
        if (typeof window === 'undefined') return false;
        try {
            const now = new Date();
            const [time, modifier] = timeStr.split(' ');
            let [hoursStr, minutesStr] = time.split(':');

            let hours = parseInt(hoursStr, 10);
            let minutes = parseInt(minutesStr, 10);

            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;

            const notificationKey = `notified_${new Date().toDateString()}_${timeStr}`;
            if (localStorage.getItem(notificationKey)) return false;

            if (now.getHours() === hours && now.getMinutes() === minutes) {
                localStorage.setItem(notificationKey, 'true');
                return true;
            }
        } catch (e) {
            console.error('Error parsing time string:', timeStr, e);
        }

        return false;
    },

    triggerNotification(session: any, index: number) {
        if (typeof window === 'undefined') return;
        const title = "STRATEGIC UPLINK: " + (session.title || 'Daily Protocol');
        const options = {
            body: `Focus: ${session.impact || 'Training'}\nDuration: ${session.duration || 'Session'}\nInitiate protocol now.`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            tag: 'boxing-drill-' + index,
            requireInteraction: true
        };

        if (Notification.permission === "granted") {
            new Notification(title, options);
        } else {
            console.log("Notification: " + title);
        }
    }
};
