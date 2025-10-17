import { existsSync, mkdirSync, readdirSync, type Stats } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage, type CanvasRenderingContext2D, type PNGStream } from "canvas";
import "./zip.ts";
import ProgressBar from "progress";
import type { Readable } from "node:stream";
import type { ReadableStreamController } from "node:stream/web";

const panoramasDir: string = path.join(import.meta.dirname, "panoramas");

if (!existsSync(panoramasDir)) {
    mkdirSync(panoramasDir);
    console.log("\u001B[38;2;85;85;255mCreated panoramas directory\u001B[0m");
}

const panoramasFolders: string[] = readdirSync(panoramasDir);

if (panoramasFolders.length === 0) {
    console.error("\u001B[38;2;255;0;0mNo panoramas found\u001B[0m");
    process.exit(1);
}

/**
 * The progress bar.
 *
 * @type {ProgressBar}
 */
const bar: ProgressBar = new ProgressBar(
    "-> Generating :bar :percent (:current/:total files) (:__current_panoramas__/:__total_panoramas__ panoramas); :rate/fps; ETA: :etas; Time elapsed: :elapseds",
    {
        total: panoramasFolders.length * 6,
        width: 30,
        complete: "\u001B[48;2;0;255;0m \u001B[0m",
        incomplete: "\u001B[48;5;0m \u001B[0m",
    }
);

let barCurrentFiles: number = 0;
let barTotalFiles: number = panoramasFolders.length;

await new Promise((resolve: (value: void) => void): void => void setTimeout(resolve, 1));

bar.tick(0, { __current_panoramas__: barCurrentFiles, __total_panoramas__: barTotalFiles });

await Promise.all(
    panoramasFolders.map(async (panoramaFolder: string): Promise<void> => {
        const panoramaDir: string = path.join(panoramasDir, panoramaFolder);
        const inputDir: string = path.join(panoramaDir, "input");
        const outputDir: string = path.join(panoramaDir, "output");
        const namedOutputDir: string = path.join(panoramaDir, "named_output");
        const panoramaFiles: string[] = existsSync(inputDir) && (await stat(inputDir)).isDirectory() ? await readdir(inputDir) : [];
        if (panoramaFiles.length === 0) {
            bar.total -= 6;
            barTotalFiles--;
            process.stdout.clearLine(-1);
            process.stdout.cursorTo(0);
            process.stdout.write(`\u001B[38;2;255;0;0mNo images found in panorama folder ${panoramaFolder}\u001B[0m\n`);
            bar.render({ __current_panoramas__: barCurrentFiles, __total_panoramas__: barTotalFiles }, true);
            return;
        }
        const hasManifest: boolean = existsSync(path.join(panoramaDir, "manifest.json"));
        if (hasManifest) {
            bar.total++;
            bar.render({ __current_panoramas__: barCurrentFiles, __total_panoramas__: barTotalFiles }, true);
        }
        const panoramaFileStats: { [key in (typeof panoramaFiles)[number]]: Stats } = Object.fromEntries(
            await Promise.all(
                panoramaFiles.map(async (panoramaFile: string, index: number): Promise<[key: string, value: Stats]> => {
                    const output: [key: string, value: Stats] = [panoramaFile, await stat(path.join(inputDir, panoramaFile))];
                    if (index < 6) {
                        bar.tick(0.05);
                        bar.curr = Number(bar.curr.toFixed(5));
                    }
                    return output;
                })
            )
        );
        bar.render({ __current_panoramas__: barCurrentFiles, __total_panoramas__: barTotalFiles }, true);
        panoramaFiles.sort((a: string, b: string): number => panoramaFileStats[a]!.ctimeMs - panoramaFileStats[b]!.ctimeMs);
        if (!existsSync(outputDir)) await mkdir(outputDir);
        if (!existsSync(namedOutputDir)) await mkdir(namedOutputDir);
        const resultImages: Buffer[] = await Promise.all(
            panoramaFiles.map(async (panoramaFile: string, index: number): Promise<Buffer> => {
                const inputPath: string = path.join(inputDir, panoramaFile);
                const outputPath: string = path.join(outputDir, `panorama_${index}.png`);
                const namedOutputPath: string = path.join(namedOutputDir, ["front", "right", "back", "left", "top", "bottom"][index] + ".png");
                const image = await loadImage(inputPath);
                const size: number = Math.min(image.width, image.height);
                const canvas = createCanvas(size, size);
                const context: CanvasRenderingContext2D = canvas.getContext("2d");
                context.imageSmoothingEnabled = false;
                context.drawImage(image, Math.floor((image.width - size) / 2), Math.floor((image.height - size) / 2), size, size, 0, 0, size, size);
                const output: Buffer = canvas.toBuffer("image/png");
                bar.tick(0.75);
                bar.curr = Number(bar.curr.toFixed(5));
                await Promise.all([
                    writeFile(outputPath, output).then((): void => (bar.tick(0.1), void (bar.curr = Number(bar.curr.toFixed(5))))),
                    writeFile(namedOutputPath, output).then((): void => (bar.tick(0.1), void (bar.curr = Number(bar.curr.toFixed(5))))),
                ]);
                return output;
            })
        );
        if (hasManifest) {
            const zipFile: zip.FS = new zip.fs.FS();
            zipFile.addText("manifest.json", (await readFile(path.join(panoramaDir, "manifest.json"))).toString());
            if (existsSync(path.join(panoramaDir, "pack_icon.png")))
                zipFile.addBlob("pack_icon.png", new Blob([await readFile(path.join(panoramaDir, "pack_icon.png"))]));
            resultImages.forEach((image: Buffer, index: number): void => {
                zipFile.addBlob(`textures/ui/panorama_${index}.png`, new Blob([image]));
            });
            bar.tick(0.5);
            bar.curr = Number(bar.curr.toFixed(5));
            await writeFile(path.join(panoramaDir, `${panoramaFolder}Panorama.mcpack`), await (await zipFile.exportBlob()).bytes());
            bar.tick(0.5);
            bar.curr = Number(bar.curr.toFixed(5));
        }
        barCurrentFiles++;
        if (bar.complete) {
            process.stdout.moveCursor(0, -1);
            process.stdout.cursorTo(0);
            process.stdout.clearLine(-1);
        }
        bar.render({ __current_panoramas__: barCurrentFiles, __total_panoramas__: barTotalFiles }, true);
        if (bar.complete) {
            process.stdout.moveCursor(0, 1);
        }
    })
);
