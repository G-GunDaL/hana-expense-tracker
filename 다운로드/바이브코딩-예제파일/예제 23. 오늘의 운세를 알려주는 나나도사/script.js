const fortunes = [
    "오늘은 생각지도 못한 행운이 찾아올 수 있어요. 작은 기회도 놓치지 마세요!",
    "조금 지칠 수도 있지만, 결국 노력한 만큼의 보상을 받게 될 거예요.",
    "새로운 인연이 기다리고 있습니다. 주변 사람들에게 밝은 미소를 보여주세요.",
    "중요한 결정을 내려야 할 때입니다. 자신의 직감을 믿어보세요.",
    "잠시 휴식을 취하는 것이 좋겠어요. 재충전의 시간이 더 큰 도약을 만듭니다.",
    "금전적인 이득이 생길 수 있는 날입니다. 현명한 소비가 필요해요.",
    "예상치 못한 난관이 있을 수 있지만, 지혜롭게 극복할 수 있습니다.",
    "오늘은 평소보다 에너지가 넘치는 날이에요. 미뤄뒀던 일을 시작해보세요!",
    "주변 사람들의 도움이 큰 힘이 됩니다. 고마움을 표현하는 하루가 되세요.",
    "오랫동안 기다려온 소식을 듣게 될 수도 있어요. 긍정적인 마음을 가지세요.",
    "창의력이 솟아나는 날입니다. 새로운 아이디어를 기록해보세요.",
    "건강에 유의해야 할 날입니다. 가벼운 운동으로 활력을 찾아보세요.",
    "오늘은 당신의 매력이 돋보이는 날입니다. 자신감을 가지세요!",
    "뜻밖의 선물이나 칭찬을 받을 수 있어요. 기분 좋은 하루가 될 거예요.",
    "계획대로 일이 술술 풀리는 날입니다. 적극적으로 행동하세요.",
    "작은 선택이 큰 변화를 만들 수 있는 날입니다. 신중하게 행동하세요.",
    "과거의 경험이 오늘의 문제를 해결하는 열쇠가 됩니다.",
    "주변의 조언에 귀를 기울이면 좋은 결과가 따라옵니다.",
    "오늘은 서두르기보다 천천히 가는 것이 유리합니다.",
    "우연처럼 보이는 일이 사실은 필연일지도 몰라요.",
    "감정 표현에 솔직해질수록 관계가 깊어집니다.",
    "집중력이 높아지는 하루입니다. 중요한 일을 처리하기 좋아요.",
    "조금은 과감해져도 괜찮은 날입니다. 도전이 기회를 부릅니다.",
    "미뤄왔던 연락을 해보세요. 반가운 반응이 돌아올 수 있어요.",
    "오늘은 혼자만의 시간이 큰 힘이 됩니다.",
    "작은 성취가 큰 자신감으로 이어집니다.",
    "평소보다 운이 부드럽게 흐르는 하루입니다.",
    "뜻하지 않은 도움을 받게 될 수 있어요. 열린 마음을 가지세요.",
    "당연하게 여겼던 것에서 감사함을 느끼게 됩니다.",
    "실수를 두려워하지 마세요. 경험이 자산이 됩니다.",
    "오늘은 배움에 좋은 날입니다. 새로운 정보를 받아들이세요.",
    "재물운은 무난하지만, 충동구매는 피하는 것이 좋아요.",
    "말 한마디가 분위기를 바꿀 수 있는 날입니다.",
    "예상보다 일이 빨리 마무리될 수 있어요.",
    "오늘의 선택이 내일의 기회를 만듭니다.",
    "주변 정리를 하면 마음도 가벼워집니다.",
    "작은 친절이 큰 행운으로 돌아옵니다.",
    "오랜 고민이 실마리를 찾게 되는 하루입니다.",
    "너무 완벽하려 하지 않아도 충분히 잘하고 있어요.",
    "오늘은 자신을 믿는 것이 가장 중요합니다.",
    "차분한 태도가 좋은 인상을 남깁니다.",
    "새로운 시도가 의외의 재미를 안겨줄 수 있어요.",
    "조금 늦어도 괜찮습니다. 방향이 맞으면 됩니다.",
    "예상치 못한 제안이 들어올 수 있는 날입니다.",
    "지금의 노력이 곧 결과로 나타날 준비를 하고 있어요.",
    "마음이 가는 쪽으로 한 발짝 움직여보세요.",
    "오늘은 긍정적인 말이 운을 끌어당깁니다.",
    "작은 변화가 일상의 활력이 됩니다.",
    "누군가의 말이 오래 기억에 남을 수 있어요.",
    "지금은 기다림이 필요한 시점입니다.",
    "기분 전환을 하면 운의 흐름이 달라집니다.",
    "오늘은 평소보다 직감이 잘 맞는 날입니다.",
    "너무 많은 것을 한 번에 하려 하지 마세요.",
    "차분하게 정리하면 답이 보입니다.",
    "주변의 분위기를 읽는 것이 도움이 됩니다.",
    "오늘은 무리하지 않는 것이 최고의 선택입니다.",
    "작은 행운이 연달아 찾아올 수 있어요.",
    "생각보다 당신을 지켜보는 사람이 많습니다.",
    "가벼운 대화 속에서 힌트를 얻게 될 수 있어요.",
    "오늘은 흐름에 몸을 맡겨도 좋은 날입니다.",
    "스스로를 칭찬해 주세요. 충분히 잘 해왔어요.",
    "오늘은 일이 생각만큼 잘 풀리지 않을 수 있어요. 무리한 결정은 피하세요.",
    "작은 오해가 커질 수 있는 날입니다. 말과 행동에 조금 더 신경 써주세요.",
    "예상치 못한 지출이 생길 수 있어요. 지갑 관리는 신중하게!",
    "집중력이 흐트러질 수 있는 하루입니다. 중요한 일은 내일로 미뤄도 좋아요.",
    "오늘은 운의 흐름이 다소 느립니다. 서두르지 않는 것이 최선이에요.",
    "괜히 나섰다가 피곤해질 수 있어요. 오늘은 한 발 물러서도 괜찮습니다.",
    "사소한 실수가 반복될 수 있는 날입니다. 한 번 더 확인하세요.",
    "컨디션이 평소보다 떨어질 수 있어요. 휴식이 가장 중요한 선택입니다.",
    "주변 상황에 휘말리기 쉬운 하루입니다. 중심을 잘 잡으세요.",
    "오늘은 새로운 시도보다는 유지에 집중하는 것이 좋겠습니다."
];


const elementIcons = {
    fire: "🔥",
    water: "💧",
    wood: "🌳",
    earth: "⛰️",
    wind: "🍃"
};

const elementNames = {
    fire: "불",
    water: "물",
    wood: "나무",
    earth: "땅",
    wind: "바람"
};

function selectElement(element) {
    // 1. Validate Form Inputs
    const name = document.getElementById('name').value;
    const birthdate = document.getElementById('birthdate').value;
    const gender = document.querySelector('input[name="gender"]:checked');

    if (!name || !birthdate || !gender) {
        alert("모든 정보를 입력해주세요!");
        return;
    }

    // Calculate Age
    const birthDateObj = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
        age--;
    }

    // 2. Generate Result
    const randomFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    const selectedIcon = elementIcons[element];

    // 3. Update UI
    document.getElementById('user-greeting').innerText = `${name}님, 선택하신 '${elementNames[element]}'의 기운으로 본 운세입니다.`;
    document.getElementById('fortune-text').innerText = randomFortune;
    document.getElementById('result-element-icon').innerText = selectedIcon;

    // 4. Switch Sections
    document.getElementById('input-section').classList.add('hidden');
    const resultSection = document.getElementById('result-section');
    resultSection.classList.remove('hidden');
    resultSection.style.display = 'block'; // Ensure it displays if hidden via CSS class wasn't enough for animation reset
}

function resetForm() {
    // Clear inputs if needed, or keep them? Usually resetting is better for a fresh start.
    // Keeping inputs might be friendlier, let's just reset the view.

    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('result-section').style.display = 'none';

    document.getElementById('input-section').classList.remove('hidden');

    // Optional: Reset form fields
    document.getElementById('fortune-form').reset();
}
