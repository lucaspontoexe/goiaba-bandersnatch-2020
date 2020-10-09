<script lang="ts">
import sample from "./goiabaSegments.json";
import fileDownload from "./fileDownload";
import { onMount } from "svelte";
// nodes
let video: HTMLMediaElement;
let button: HTMLElement;

// globals
const segmentsFilenames = new Set(
  sample.segments.map((i) => i.files).flat()
);

const buffers = new Map();
let mediaSource = new MediaSource();
let sourceBuffer: SourceBuffer;

// state
let currentSegment = sample.segments[0];
let lastTime = 0;
let lastSegmentMark = 0;
let appState = "LOADING"; // async ya know (ready?)
let chosenOption = {name: '__empty__', goto: ''};

// load buffers when source is open
mediaSource.addEventListener("sourceopen", async () => {
  for (const segment of segmentsFilenames) {
    console.log('adding', segment)
    buffers.set(segment, await fileDownload(segment))
  }
  console.log(buffers);

  // for future: specify codec in json
  sourceBuffer = mediaSource.addSourceBuffer('video/webm;codecs="vp9,opus"');
  sourceBuffer.appendBuffer(buffers.get(currentSegment.files[0])); // TODO: use custom function to append all files
  appState = "READY";
});

// add source buffer when video is ready
onMount(() => {video.src = window.URL.createObjectURL(mediaSource);})


function start() {
  appState = "INIT_SEGMENT";
  video.play();
  loop();
}

function loop() {
  let currentTime = video.currentTime * 1000; // seconds or miliseconds
  switch (appState) {
    case "INIT_SEGMENT":
      console.log('loop: init segment')
      lastTime = currentTime;
      lastSegmentMark = currentTime;
    console.log(chosenOption)
      // only set variables if we're not in the first iteration
      if (chosenOption.name === "__empty__") return;

      currentSegment = sample.segments.find(
        (s) => s.name === chosenOption.goto
      );
      appState = 'WAIT_FOR_PROMPT';
      break;

    case "WAIT_FOR_PROMPT":
      console.log('loop: wait for prompt')
      if ((currentTime - lastTime) >= currentSegment.promptIn) {
        appState = "ONGOING_PROMPT";
        console.log("decision prompt is here");
        lastTime = video.currentTime;
      }
      break;

    case "ONGOING_PROMPT":
      console.log('loop: ongoing prompt')
      if (currentTime - lastTime >= currentSegment.decisionTimeout) {
        // pick random option
        console.log("timeout, picking random option");
        chosenOption =
          currentSegment.options[
            Math.floor(Math.random() * currentSegment.options.length)
          ];
        appState = "APPEND_NEXT_SEG";
      }
      break;

    case "APPEND_NEXT_SEG":
      console.log('loop: attempting to append')
      // return if we can't update right now;
      if (sourceBuffer.updating || sourceBuffer.buffered.length <= 0) return;
      // Append the video segments and adjust the timestamp offset
      // forward

      // function addBuffer?
      sourceBuffer.timestampOffset = sourceBuffer.buffered.end(
        sourceBuffer.buffered.length - 1
      );
      // TODO: append multiple files
      sourceBuffer.appendBuffer(buffers.get(currentSegment.files[0]));
      // on append() loop end
      appState = "WAITING_FOR_NEXT_SEG";
      break;

    case "WAITING_FOR_NEXT_SEG":
      console.log('loop: waiting for next')
      if (currentTime - lastSegmentMark >= currentSegment.nextSegmentIn)
        appState = "INIT_SEGMENT";
      break;

    default:
      console.log("unrecognized state: ", appState);
      break;
  }
  window.requestAnimationFrame(loop);
}
</script>


<!-- svelte-ignore a11y-media-has-caption -->
<video controls bind:this={video}/>
<button bind:this={button} on:click={start}>bora</button>
<br/>
debug:
<br/>
{appState}
<br>
{JSON.stringify(currentSegment)}
