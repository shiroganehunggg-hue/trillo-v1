const STREAK_STORAGE_KEY = "trillo-practice-streak";

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDaysDiff(fromDate, toDate) {
    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T00:00:00`);
    return Math.round((end - start) / 86400000);
}

function readStreakState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY) || "null");
        if (!saved || typeof saved !== "object") {
            return { current: 0, longest: 0, lastActiveDate: null };
        }

        return {
            current: Number(saved.current) || 0,
            longest: Number(saved.longest) || 0,
            lastActiveDate: saved.lastActiveDate || null,
        };
    } catch (error) {
        return { current: 0, longest: 0, lastActiveDate: null };
    }
}

function writeStreakState(state) {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(state));
}

function updateStreak() {
    const state = readStreakState();
    const today = getTodayKey();

    if (!state.lastActiveDate) {
        state.current = 1;
    } else {
        const diff = getDaysDiff(state.lastActiveDate, today);

        if (diff === 0) {
            state.current = state.current || 1;
        } else if (diff === 1) {
            state.current += 1;
        } else {
            state.current = 1;
        }
    }

    state.lastActiveDate = today;
    state.longest = Math.max(state.longest, state.current);
    writeStreakState(state);

    const streakCount = document.getElementById("streakCount");
    const streakPlural = document.getElementById("streakPlural");
    const bestStreak = document.getElementById("bestStreak");

    if (streakCount) {
        streakCount.textContent = String(state.current);
    }

    if (streakPlural) {
        streakPlural.textContent = state.current === 1 ? "" : "s";
    }

    if (bestStreak) {
        bestStreak.textContent = String(state.longest);
    }
}

document.addEventListener("DOMContentLoaded", updateStreak);
