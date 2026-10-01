document.addEventListener('DOMContentLoaded', () => {
    const inputSection = document.getElementById('input-section');
    const displaySection = document.getElementById('display-section');
    const form = document.getElementById('status-form');

    // Output Elements
    const outActivity = document.getElementById('display-activity');
    const outReturnTime = document.getElementById('display-return-time');
    const outCountdown = document.getElementById('display-countdown');
    const outMessage = document.getElementById('display-message');

    let countdownInterval;

    // Enhance Time Input UX
    const returnTimeInput = document.getElementById('return-time');

    // Open picker on any click
    returnTimeInput.addEventListener('click', () => {
        try {
            returnTimeInput.showPicker();
        } catch (error) {
            console.log('showPicker not supported or failed', error);
        }
    });

    // Prevent typing (force UI picker usage)
    returnTimeInput.addEventListener('keydown', (e) => {
        e.preventDefault();
    });

    // Confirm Button Logic
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Get Values
        const activity = document.getElementById('activity').value || 'Away';
        const returnTimeVal = document.getElementById('return-time').value;
        const message = document.getElementById('message').value;

        // 2. Set Values to Display
        outActivity.textContent = activity;

        // Handle Time and Countdown
        if (returnTimeVal) {
            outReturnTime.textContent = `Back at ${returnTimeVal}`;
            outReturnTime.style.display = 'block';

            startCountdown(returnTimeVal);
            outCountdown.style.display = 'block';
        } else {
            outReturnTime.style.display = 'none';
            outCountdown.style.display = 'none';
        }

        if (message) {
            outMessage.textContent = message;
            outMessage.style.display = 'block';
        } else {
            outMessage.style.display = 'none';
        }

        // 3. Switch Views with Animation AND Request Fullscreen
        enterFullscreen();

        inputSection.style.opacity = '0';

        setTimeout(() => {
            inputSection.classList.add('hidden');
            displaySection.classList.remove('hidden');
            // Trigger reflow
            void displaySection.offsetWidth;
            displaySection.style.display = 'flex'; // Ensure flex layout

            // Fade in display
            requestAnimationFrame(() => {
                displaySection.style.opacity = '1';
            });
        }, 500);
    });

    function startCountdown(timeStr) {
        if (countdownInterval) clearInterval(countdownInterval);

        const now = new Date();
        const [hours, minutes] = timeStr.split(':').map(Number);

        let target = new Date();
        target.setHours(hours, minutes, 0, 0);

        // If target time is earlier than now, assume it's tomorrow
        if (target < now) {
            target.setDate(target.getDate() + 1);
        }

        updateCountdown(); // Initial call
        countdownInterval = setInterval(updateCountdown, 1000);

        function updateCountdown() {
            const current = new Date();
            const diff = target - current;

            if (diff <= 0) {
                clearInterval(countdownInterval);
                outCountdown.textContent = "Welcome Back!";
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            const parts = [];
            if (h > 0) parts.push(`${h}h`);
            if (m > 0 || h > 0) parts.push(`${m}m`);
            parts.push(`${s}s`);

            outCountdown.textContent = parts.join(' ');
        }
    }

    // Optional: Return to edit on click or Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !displaySection.classList.contains('hidden')) {
            returnToEdit();
        }
    });

    // Add a double-click listener to the background to return to edit
    displaySection.addEventListener('dblclick', returnToEdit);

    function returnToEdit() {
        if (countdownInterval) clearInterval(countdownInterval);

        displaySection.style.opacity = '0';

        exitFullscreen();

        setTimeout(() => {
            displaySection.classList.add('hidden');
            displaySection.style.display = 'none'; // Reset to none
            inputSection.classList.remove('hidden');

            // Fade in input
            requestAnimationFrame(() => {
                inputSection.style.opacity = '1';
            });
        }, 500);
    }

    function enterFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.log(err));
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            elem.msRequestFullscreen();
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            if (document.fullscreenElement) document.exitFullscreen().catch(err => console.log(err));
        } else if (document.webkitExitFullscreen) { /* Safari */
            if (document.webkitFullscreenElement) document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            if (document.msFullscreenElement) document.msExitFullscreen();
        }
    }
});
