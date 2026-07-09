// build 前清空 dist：避免舊產物殘留（例如元件改名後留下的孤兒 js，會被誤當成現役資產）。
// 只刪 dist 的「內容」而不刪 dist 本身 —— 開發時 `npm run dev` 的靜態伺服器可能正把 dist 當工作目錄，
// 直接 rm 整個資料夾在 Windows 上會 EPERM。
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

if (existsSync("dist")) {
    for (const entry of readdirSync("dist")) rmSync(join("dist", entry), { recursive: true, force: true });
}
