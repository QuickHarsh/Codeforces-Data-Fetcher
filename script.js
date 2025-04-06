document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const usernameInput = document.getElementById('username');
    const loadingDiv = document.getElementById('loading');
    const userDataDiv = document.getElementById('user-data');
    const errorDiv = document.getElementById('error');

    searchBtn.addEventListener('click', fetchUserData);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchUserData();
        }
    });

    async function fetchUserData() {
        const username = usernameInput.value.trim();
        if (!username) {
            showError('Please enter a username');
            return;
        }

        showLoading();
        hideError();
        hideUserData();

        try {
            const [userResponse, contestsResponse, submissionsResponse] = await Promise.all([
                fetch(`https://codeforces.com/api/user.info?handles=${username}`),
                fetch(`https://codeforces.com/api/user.rating?handle=${username}`),
                fetch(`https://codeforces.com/api/user.status?handle=${username}`)
            ]);

            const [userData, contestsData, submissionsData] = await Promise.all([
                userResponse.json(),
                contestsResponse.json(),
                submissionsResponse.json()
            ]);

            if (userData.status === 'OK') {
                const user = userData.result[0];
                displayUserData(user);
                if (contestsData.status === 'OK') {
                    displayContestData(contestsData.result);
                }
                if (submissionsData.status === 'OK') {
                    displaySubmissionData(submissionsData.result);
                }
            } else {
                showError('User not found or API error');
            }
        } catch (error) {
            showError('Failed to fetch user data. Please try again later.');
            console.error('Error:', error);
        } finally {
            hideLoading();
        }
    }

    function displayUserData(user) {
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const userRank = document.getElementById('user-rank');
        const userRating = document.getElementById('user-rating');
        const profileLink = document.getElementById('profile-link');
        const currentRating = document.getElementById('current-rating');
        const maxRating = document.getElementById('max-rating');

        userAvatar.src = user.titlePhoto || 'https://codeforces.org/s/0/images/user.png';
        userAvatar.alt = `${user.handle}'s avatar`;

        userName.textContent = user.handle;
        userRank.textContent = `${user.rank || 'Unrated'}`;
        userRating.textContent = `Current Rating: ${user.rating || 'N/A'}`;
        currentRating.textContent = `Current: ${user.rating || 'N/A'}`;
        maxRating.textContent = `Max: ${user.maxRating || 'N/A'}`;

        profileLink.href = `https://codeforces.com/profile/${user.handle}`;

        showUserData();
    }

    function displayContestData(contests) {
        const contestsCount = document.getElementById('contests-count');
        const bestRank = document.getElementById('best-rank');
        const contestPerformance = document.getElementById('contest-performance');

        contestsCount.textContent = contests.length;
        
        if (contests.length > 0) {
            const bestRankValue = Math.min(...contests.map(contest => contest.rank));
            bestRank.textContent = `Best Rank: ${bestRankValue}`;

            const performanceTimeline = contestPerformance.querySelector('.performance-timeline');
            performanceTimeline.innerHTML = contests
                .sort((a, b) => b.ratingUpdateTimeSeconds - a.ratingUpdateTimeSeconds)
                .slice(0, 10) // Show last 10 contests
                .map(contest => {
                    const date = new Date(contest.ratingUpdateTimeSeconds * 1000);
                    const ratingChange = contest.newRating - contest.oldRating;
                    const ratingChangeClass = ratingChange >= 0 ? 'success' : 'danger';
                    
                    return `
                        <div class="contest-item">
                            <div class="contest-info">
                                <div class="contest-name">${contest.contestName}</div>
                                <div class="contest-details">
                                    <span class="contest-rank">Rank: ${contest.rank}</span>
                                    <span class="contest-rating-change ${ratingChangeClass}">
                                        Rating: ${ratingChange >= 0 ? '+' : ''}${ratingChange}
                                    </span>
                                    <span class="contest-date">
                                        ${date.toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
        }
    }

    function displaySubmissionData(submissions) {
        const problemsSolved = document.getElementById('problems-solved');
        const successRate = document.getElementById('success-rate');
        const easyCount = document.getElementById('easy-count');
        const mediumCount = document.getElementById('medium-count');
        const hardCount = document.getElementById('hard-count');
        const veryHardCount = document.getElementById('very-hard-count');
        const recentSubmissions = document.getElementById('recent-submissions');
        const languageStats = document.getElementById('language-stats');
        const tagsDistribution = document.getElementById('tags-distribution');
        const todaySubmissions = document.getElementById('today-submissions');
        const weekSubmissions = document.getElementById('week-submissions');
        const monthSubmissions = document.getElementById('month-submissions');
        const avgTime = document.getElementById('avg-time');
        const activeTime = document.getElementById('active-time');
        const streak = document.getElementById('streak');

        const solvedProblems = new Set();
        const problemCounts = {
            easy: new Set(),
            medium: new Set(),
            hard: new Set(),
            veryHard: new Set()
        };
        const languageUsage = new Map();
        const tagUsage = new Map();
        const recentSubmissionsList = [];
        const submissionTimes = [];
        const solvedTimes = [];
        const hourDistribution = new Array(24).fill(0);
        const submissionDates = new Set();

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        let todayCount = 0;
        let weekCount = 0;
        let monthCount = 0;

        submissions.forEach(submission => {
            const submissionDate = new Date(submission.creationTimeSeconds * 1000);
            const submissionHour = submissionDate.getHours();
            hourDistribution[submissionHour]++;

            if (submissionDate >= today) todayCount++;
            if (submissionDate >= weekAgo) weekCount++;
            if (submissionDate >= monthAgo) monthCount++;

            if (submission.verdict === 'OK') {
                const problemId = `${submission.problem.contestId}${submission.problem.index}`;
                solvedProblems.add(problemId);
                submissionDates.add(submissionDate.toDateString());

                const problemIndex = submission.problem.index;
                if (problemIndex === 'A') {
                    problemCounts.easy.add(problemId);
                } else if (problemIndex === 'B') {
                    problemCounts.medium.add(problemId);
                } else if (problemIndex === 'C') {
                    problemCounts.hard.add(problemId);
                } else {
                    problemCounts.veryHard.add(problemId);
                }

                const language = submission.programmingLanguage;
                languageUsage.set(language, (languageUsage.get(language) || 0) + 1);

                if (submission.problem.tags) {
                    submission.problem.tags.forEach(tag => {
                        tagUsage.set(tag, (tagUsage.get(tag) || 0) + 1);
                    });
                }

                if (submission.timeConsumedMillis) {
                    solvedTimes.push(submission.timeConsumedMillis / 1000 / 60); // Convert to minutes
                }
            }

            if (recentSubmissionsList.length < 10) {
                recentSubmissionsList.push(submission);
            }
        });

        todaySubmissions.textContent = todayCount;
        weekSubmissions.textContent = weekCount;
        monthSubmissions.textContent = monthCount;

        if (solvedTimes.length > 0) {
            const avg = solvedTimes.reduce((a, b) => a + b, 0) / solvedTimes.length;
            avgTime.textContent = `${avg.toFixed(1)} min`;
        }

        const maxHour = hourDistribution.indexOf(Math.max(...hourDistribution));
        activeTime.textContent = `${maxHour}:00 - ${maxHour + 1}:00`;

        const dates = Array.from(submissionDates).sort();
        let currentStreak = 0;
        let maxStreak = 0;
        let currentDate = new Date(dates[0]);
        
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            const diffTime = Math.abs(date - currentDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                currentStreak++;
            } else if (diffDays > 1) {
                currentStreak = 1;
            }
            
            maxStreak = Math.max(maxStreak, currentStreak);
            currentDate = date;
        }
        
        streak.textContent = `${maxStreak} days`;

        problemsSolved.textContent = solvedProblems.size;
        const successRateValue = (solvedProblems.size / submissions.length * 100).toFixed(1);
        successRate.textContent = `Success Rate: ${successRateValue}%`;

        easyCount.textContent = problemCounts.easy.size;
        mediumCount.textContent = problemCounts.medium.size;
        hardCount.textContent = problemCounts.hard.size;
        veryHardCount.textContent = problemCounts.veryHard.size;

        const totalProblems = solvedProblems.size;
        if (totalProblems > 0) {
            const easyPercentage = (problemCounts.easy.size / totalProblems * 100).toFixed(1);
            const mediumPercentage = (problemCounts.medium.size / totalProblems * 100).toFixed(1);
            const hardPercentage = (problemCounts.hard.size / totalProblems * 100).toFixed(1);
            const veryHardPercentage = (problemCounts.veryHard.size / totalProblems * 100).toFixed(1);

            document.getElementById('easy-progress').style.width = `${easyPercentage}%`;
            document.getElementById('medium-progress').style.width = `${mediumPercentage}%`;
            document.getElementById('hard-progress').style.width = `${hardPercentage}%`;
            document.getElementById('very-hard-progress').style.width = `${veryHardPercentage}%`;

            document.getElementById('easy-percentage').textContent = `${easyPercentage}%`;
            document.getElementById('medium-percentage').textContent = `${mediumPercentage}%`;
            document.getElementById('hard-percentage').textContent = `${hardPercentage}%`;
            document.getElementById('very-hard-percentage').textContent = `${veryHardPercentage}%`;
        }

        recentSubmissions.innerHTML = recentSubmissionsList.map(sub => {
            const date = new Date(sub.creationTimeSeconds * 1000);
            const timeString = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const rating = sub.problem.rating || 'N/A';
            
            return `
                <div class="submission-item">
                    <div class="submission-details">
                        <span class="problem-name">${sub.problem.name}</span>
                        <span class="submission-time">${timeString}</span>
                    </div>
                    <div class="submission-info">
                        <span class="problem-rating">${rating}</span>
                        <span class="verdict ${sub.verdict === 'OK' ? 'success' : 'failed'}">${sub.verdict}</span>
                    </div>
                </div>
            `;
        }).join('');

        languageStats.innerHTML = Array.from(languageUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([lang, count]) => `
                <div class="language-item">
                    <span class="language-name">${lang}</span>
                    <span class="language-count">${count}</span>
                </div>
            `).join('');

        tagsDistribution.innerHTML = Array.from(tagUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([tag, count]) => `
                <div class="tag-item">
                    <span class="tag-name">${tag}</span>
                    <span class="tag-count">${count}</span>
                </div>
            `).join('');
    }

    function showLoading() {
        loadingDiv.classList.remove('hidden');
    }

    function hideLoading() {
        loadingDiv.classList.add('hidden');
    }

    function showUserData() {
        userDataDiv.classList.remove('hidden');
    }

    function hideUserData() {
        userDataDiv.classList.add('hidden');
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    function hideError() {
        errorDiv.classList.add('hidden');
    }
}); 