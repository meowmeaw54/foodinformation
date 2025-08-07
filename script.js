
// 기본 날짜를 오늘로 설정
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    document.getElementById('meal-date').value = dateString;
});

// 급식 정보 조회 함수
async function getMealInfo() {
    const dateInput = document.getElementById('meal-date');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        alert('날짜를 선택해주세요.');
        return;
    }
    
    // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
    const formattedDate = selectedDate.replace(/-/g, '');
    
    // 로딩 표시
    showLoading();
    
    try {
        // NEIS API URL 구성
        const apiUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7530079&MLSV_YMD=${formattedDate}`;
        
        // CORS 프록시를 사용하여 API 호출
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
        
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error('네트워크 오류가 발생했습니다.');
        }
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // 급식 정보 파싱
        const mealInfo = parseMealData(xmlDoc, selectedDate);
        displayMealInfo(mealInfo);
        
    } catch (error) {
        console.error('급식 정보 조회 오류:', error);
        displayError('급식 정보를 불러오는데 실패했습니다. 다시 시도해주세요.');
    } finally {
        hideLoading();
    }
}

// XML 데이터 파싱 함수
function parseMealData(xmlDoc, selectedDate) {
    const mealInfo = {
        date: selectedDate,
        meals: []
    };
    
    // 오류 체크
    const errorElements = xmlDoc.getElementsByTagName('RESULT');
    if (errorElements.length > 0) {
        const errorCode = errorElements[0].getElementsByTagName('CODE')[0]?.textContent;
        if (errorCode && errorCode !== 'INFO-000') {
            return null;
        }
    }
    
    // 급식 데이터 추출
    const rows = xmlDoc.getElementsByTagName('row');
    
    if (rows.length === 0) {
        return null;
    }
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        const mealTypeElement = row.getElementsByTagName('MMEAL_SC_NM')[0];
        const dishNameElement = row.getElementsByTagName('DDISH_NM')[0];
        
        if (mealTypeElement && dishNameElement) {
            const mealType = mealTypeElement.textContent;
            const dishName = dishNameElement.textContent;
            
            // 기존 급식 타입이 있는지 확인
            let existingMeal = mealInfo.meals.find(meal => meal.type === mealType);
            
            if (!existingMeal) {
                existingMeal = {
                    type: mealType,
                    menu: []
                };
                mealInfo.meals.push(existingMeal);
            }
            
            // 메뉴 항목 분리 (줄바꿈으로 구분)
            const menuItems = dishName.split('<br/>').filter(item => item.trim() !== '');
            existingMeal.menu = existingMeal.menu.concat(menuItems);
        }
    }
    
    return mealInfo;
}

// 급식 정보 표시 함수
function displayMealInfo(mealInfo) {
    const mealContent = document.getElementById('meal-content');
    
    if (!mealInfo || mealInfo.meals.length === 0) {
        mealContent.innerHTML = '<p class="no-data">해당 날짜에 급식 정보가 없습니다.</p>';
        return;
    }
    
    // 날짜 포맷팅
    const dateObj = new Date(mealInfo.date);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
    };
    const formattedDate = dateObj.toLocaleDateString('ko-KR', options);
    
    let html = `<div class="date-info">${formattedDate}</div>`;
    
    mealInfo.meals.forEach(meal => {
        html += `
            <div class="meal-menu">
                <h3>${meal.type}</h3>
                <div class="menu-items">
                    ${meal.menu.map(item => `<span class="menu-item">${cleanMenuItem(item)}</span>`).join('')}
                </div>
            </div>
        `;
    });
    
    mealContent.innerHTML = html;
}

// 메뉴 아이템 정리 함수 (알레르기 정보 등 제거)
function cleanMenuItem(item) {
    // 숫자와 점으로 구성된 알레르기 정보 제거 (예: 1.2.5.6.)
    return item.replace(/[\d\.]+/g, '').trim();
}

// 오류 표시 함수
function displayError(message) {
    const mealContent = document.getElementById('meal-content');
    mealContent.innerHTML = `<div class="error">${message}</div>`;
}

// 로딩 표시 함수
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('meal-result').style.opacity = '0.5';
}

// 로딩 숨김 함수
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('meal-result').style.opacity = '1';
}

// Enter 키 이벤트 처리
document.getElementById('meal-date').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getMealInfo();
    }
});
