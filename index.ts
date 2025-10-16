import { existsSync, mkdirSync, readdirSync, type Stats } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas, loadImage, type CanvasRenderingContext2D } from "canvas";
import "./zip.ts";

const panoramasDir: string = path.join(import.meta.dirname, "panoramas");

if (!existsSync(panoramasDir)) {
    mkdirSync(panoramasDir);
    console.log("Created panoramas directory");
}

const panoramasFolders: string[] = readdirSync(panoramasDir);

if (panoramasFolders.length === 0) {
    console.error("No panoramas found");
    process.exit(1);
}

await Promise.all(
    panoramasFolders.map(async (panoramaFolder: string): Promise<void> => {
        const panoramaDir: string = path.join(panoramasDir, panoramaFolder);
        const inputDir: string = path.join(panoramaDir, "input");
        const outputDir: string = path.join(panoramaDir, "output");
        const namedOutputDir: string = path.join(panoramaDir, "named_output");
        const panoramaFiles: string[] = await readdir(inputDir);
        if (panoramaFiles.length === 0) {
            console.error(`No images found in panorama folder ${panoramaFolder}`);
        }
        const panoramaFileStats: { [key in (typeof panoramaFiles)[number]]: Stats } = Object.fromEntries(
            await Promise.all(
                panoramaFiles.map(async (panoramaFile: string): Promise<[string, Stats]> => [panoramaFile, await stat(path.join(inputDir, panoramaFile))])
            )
        );
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
                await Promise.all([writeFile(outputPath, output), writeFile(namedOutputPath, output)]);
                return output;
            })
        );
        if (existsSync(path.join(panoramaDir, "manifest.json"))) {
            const zipFile: zip.FS = new zip.fs.FS();
            zipFile.addText("manifest.json", (await readFile(path.join(panoramaDir, "manifest.json"))).toString());
            if (existsSync(path.join(panoramaDir, "pack_icon.png")))
                zipFile.addBlob("pack_icon.png", new Blob([await readFile(path.join(panoramaDir, "pack_icon.png"))]));
            resultImages.forEach((image: Buffer, index: number): void => {
                zipFile.addBlob(`textures/ui/panorama_${index}.png`, new Blob([image]));
            });
            await writeFile(path.join(panoramaDir, `${panoramaFolder}Panorama.mcpack`), await (await zipFile.exportBlob()).bytes());
        }
    })
);
