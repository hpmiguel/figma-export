import {test} from "@playwright/test";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config();

const projects = JSON.parse(
  fs.readFileSync("files.json", { encoding: "utf-8" }),
);

const authFlow = async(page) => {
  const FIGMA_AUTH_COOKIE = process.env.FIGMA_AUTH_COOKIE;

  if (FIGMA_AUTH_COOKIE) {
    const authCookie = {
      name: "__Host-figma.authn",
      value: FIGMA_AUTH_COOKIE,
      domain: "www.figma.com",
      path: "/",
      httpOnly: true,
      secure: true,
    };

    await page.context().addCookies([authCookie]);

    await page.goto("https://www.figma.com/files");
  } else {
    await page.goto("https://www.figma.com/login");

    await page
        .getByRole("textbox", { name: "email" })
        .fill(process.env.FIGMA_EMAIL!);
    await page
        .getByRole("textbox", { name: "password" })
        .fill(process.env.FIGMA_PASSWORD!);

    await page.getByRole("button", { name: "log in" }).click();

  }

  await page.waitForTimeout(5000);
}

for (const project of projects) {
  const projectName = project.name || "Drafts";
  const teamId = project.team_id || null;

  test.describe(`project: ${projectName} (${project.id})`, () => {
    for (const file of project.files) {
      test(`file: ${file.name} (${file.key})`, async ({ page }) => {
        //await authFlow(page);

        //await page.goto(`https://www.figma.com/design/${file.key}/`);
        await page.goto(`/design/${file.key}/`);

        await page.waitForTimeout(8000);

        const downloadPromise = page.waitForEvent("download");

        await page.locator("#toggle-menu-button").click();
        await page.locator("[id^='mainMenu-file-menu-']").click();
        await page.locator("[id^='mainMenu-save-as-']").click();

        const download = await downloadPromise;
        const suggestedFilename = download.suggestedFilename();
        const filename = suggestedFilename.match(/.*(?=\.[\w\d]+)/)![0];
        const extension = suggestedFilename.replace(filename + ".", "");
        await download.saveAs(
          `${process.env.DOWNLOAD_PATH!}/${teamId ? teamId + "/" : ""}${projectName} (${project.id})/${filename} (${file.key}).${extension}`,
        );

        await page.waitForTimeout(Number(process.env.WAIT_TIMEOUT) || 0);
      });
    }
  });
}
