import { STORAGE_KEY } from "./storage";

export default async function getIdsFromPlayerLog(file: File, saveOnLocalStorage: boolean = false) {

    const ids = new Set<number>();
    const text: string = await file.text();
    const LOG_RE = /AchievementManager\s*\|\s*(?:<b>)?Achievement_ReadAllLogs(?:<\/b>)?\s*::\s*(?:Initialized Data\.\s*Logs Read:\s*\d+\s*\/\s*\d+\s*\|\s*IDs:\s*\[([0-9,\s]*)\]|Read New Log:\s*\[(\d+)\](?:\s*\|\s*\d+\s*\/\s*\d+)?)/g;
  
    text.match(LOG_RE)?.forEach(m => {
      m.match(/\b\d{9,10}\b/g)?.map(Number).forEach(ids.add, ids);
    });
  
    if (saveOnLocalStorage) localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));

    return ids;
  }