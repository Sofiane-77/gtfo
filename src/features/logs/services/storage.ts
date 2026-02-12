export const STORAGE_KEY = "gtfo-player-logs";


export function getIdsFromLocalStorage(): Set<number> {
    try {
        return new Set<number>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? ""));
    } catch {
        return new Set<number>();
    }
}