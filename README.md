# 8Crafter's Panorama Generator

## Instructions

To create a panorama, do the following:

1. Open Minecraft.
2. Set your FOV to `90.00`.
3. Disable the `FOV Can Be Altered By Gameplay` toggle.
3. Put Minecraft in fullscreen.
4. Choose the direction you want it to start out facing (find the y vector of that rotation (should be between `-180` and `180`), this will be referenced as `rotY`).
5. Take screenshots in the following directions in this order (the order matters because the script uses the creation date of the file to determine the order).
    1. `{ x: 0, y: rotY }`
    2. `{ x: 0, y: rotY + 90 }`
    3. `{ x: 0, y: rotY + 180 }`
    4. `{ x: 0, y: rotY + 270 }`
    5. `{ x: -90, y: rotY }`
    6. `{ x: 90, y: rotY }`
6. Create a panoramas folder inside the folder containing this README file if the folder does not already exist.
7. Create a folder inside the panoramas folder with the name of your panorama.
8. Create an `input` folder inside of the folder with the name of your panorama.
9. Paste the screenshots into the `input` folder.
10. (OPTIONAL) Add a `manifest.json` and (OPTIONAL) `pack_icon.png` into the folder with the name of your panorama if you would like an `.mcpack` file to be generated for your panorama.
11. Run the script with `npm run start`.
12. The output will be inside the folder with the name of your panorama.
    -   There will be a folder called `output` inside of the folder, which will contain the images named correctly to be put into the `textures/ui` folder on a resource pack.
    -   There will be a folder called `named_output` inside of the folder, which will contain the images named based on which side of the panorama they are.
    -   There will be a file called `${panoramaName}Panorama.mcpack` inside of the folder if you have a `manifest.json` in the folder, which is the resource pack for the panorama.

### Example 1:

This is an example set of commands to use for positioning yourself correctly to take the screenshots for the panorama.

```mcfunction
/tp ~~~ 0 0
/tp ~~~ 90 0
/tp ~~~ 180 0
/tp ~~~ 270 0
/tp ~~~ -90 0
/tp ~~~ 90 0
```

### Example 2:

This is an example set of commands and scripts to use for positioning yourself correctly to take the screenshots for the panorama.

```mcfunction
/tp 48183.0 118 31372.0 0 0
```

Note: The script in this example uses [8Crafter's Server Utilities & Debug Sticks](https://wiki.8crafter.com/andexdb/general/server-utilities) add-on (you give yourself the `canUseScriptEval` tag and then paste it into chat).

Run the below script 6 times, each time incrementing the `0` at the end, taking a screenshot after running it each time.

```js
${ase}function setPanoramaCamera(location, rotY, screenshotIndex = 0) {player.camera.setCamera("minecraft:free", { location, rotation: { x: screenshotIndex < 4 ? 0 : -90 * (-1) ** screenshotIndex, y: rotY + (screenshotIndex < 4 ? screenshotIndex * 90 : 0) } })}; setPanoramaCamera({ x: 48183, y: 118 + (player.getHeadLocation().y - player.location.y), z: 31377 }, 180, 0);
```
