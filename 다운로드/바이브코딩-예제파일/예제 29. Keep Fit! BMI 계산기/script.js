document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculate-btn');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const resultCard = document.getElementById('result-card');

    calculateBtn.addEventListener('click', calculateBMI);

    // Allow Enter key to trigger calculation
    [heightInput, weightInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculateBMI();
        });
    });

    function calculateBMI() {
        const heightCm = parseFloat(heightInput.value);
        const weightKg = parseFloat(weightInput.value);
        const gender = document.querySelector('input[name="gender"]:checked').value;

        if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
            alert('Please enter valid height and weight.');
            return;
        }

        const heightM = heightCm / 100;

        // 1. Calculate BMI
        const bmi = weightKg / (heightM * heightM);

        // 2. Calculate Standard Weight (Ideal Body Weight)
        // Men: Height(m)^2 * 22
        // Women: Height(m)^2 * 21
        const factor = gender === 'male' ? 22 : 21;
        const standardWeight = (heightM * heightM) * factor;

        // 3. Update UI
        updateBMIResult(bmi);
        updateTargets(weightKg, standardWeight);

        // Show result card with animation
        resultCard.classList.remove('visible');
        void resultCard.offsetWidth; // Trigger reflow
        resultCard.classList.add('visible');
    }

    function updateBMIResult(bmi) {
        const bmiValueEl = document.getElementById('bmi-value');
        const bmiStatusEl = document.getElementById('bmi-status');

        bmiValueEl.textContent = bmi.toFixed(1);

        let statusText = '';
        let statusClass = '';

        if (bmi < 18.5) {
            statusText = 'Underweight';
            statusClass = 'status-underweight';
        } else if (bmi < 23) {
            statusText = 'Normal';
            statusClass = 'status-normal';
        } else if (bmi < 25) {
            statusText = 'Overweight';
            statusClass = 'status-overweight';
        } else {
            statusText = 'Obese';
            statusClass = 'status-obese';
        }

        bmiStatusEl.textContent = statusText;
        bmiStatusEl.className = `bmi-status ${statusClass}`;
    }

    function updateTargets(currentWeight, standardWeight) {
        const targets = [
            { id: '90', factor: 0.9 },
            { id: '100', factor: 1.0 },
            { id: '110', factor: 1.1 }
        ];

        targets.forEach(target => {
            const targetWeight = standardWeight * target.factor;
            const diff = targetWeight - currentWeight;

            const weightEl = document.getElementById(`target-${target.id}`);
            const diffEl = document.getElementById(`diff-${target.id}`);

            weightEl.textContent = `${targetWeight.toFixed(1)} kg`;

            if (Math.abs(diff) < 0.1) {
                diffEl.textContent = 'Maintain';
                diffEl.className = 'target-diff diff-maintain';
            } else if (diff > 0) {
                diffEl.textContent = `+${diff.toFixed(1)} kg (Gain)`;
                diffEl.className = 'target-diff diff-gain';
            } else {
                diffEl.textContent = `${diff.toFixed(1)} kg (Lose)`;
                diffEl.className = 'target-diff diff-lose';
            }
        });
    }
});
