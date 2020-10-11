<script lang="ts">
  import sample from "./goiabaSegments.json";
  import fileDownload from "./fileDownload";
  import { onMount } from "svelte";
  import DecisionPrompt from "./DecisionPrompt.svelte";

  type appStates =
    | "LOADING"
    | "READY"
    | "INIT_SEGMENT"
    | "WAIT_FOR_PROMPT"
    | "ONGOING_PROMPT"
    | "APPEND_NEXT_SEG"
    | "WAITING_FOR_NEXT_SEG"
    | "WAITING_FOR_END"
    | "END";

  // nodes
  let video: HTMLMediaElement;

  // globals
  const segmentsFilenames = new Set(sample.segments.map((i) => i.files).flat());

  const buffers = new Map();
  let mediaSource = new MediaSource();
  let sourceBuffer: SourceBuffer;
  let loopID: number;

  // state
  let currentSegment = sample.segments[0];
  let currentTime = 0;
  let lastTime = 0;
  let lastSegmentMark = 0;
  let appendThisBufferNumber = 0;
  let appState: appStates = "LOADING"; // async ya know (ready?)
  let chosenOption = { name: "__empty__", goto: "" };

  // load buffers when source is open
  mediaSource.addEventListener("sourceopen", async () => {
    for (const segment of segmentsFilenames) {
      console.log("adding", segment);
      buffers.set(segment, await fileDownload(segment));
    }
    console.log(buffers);

    // for future: specify codec in json
    sourceBuffer = mediaSource.addSourceBuffer(
      'video/webm;codecs="vp9,vorbis"'
    );
    sourceBuffer.appendBuffer(buffers.get(currentSegment.files[0])); // TODO: use custom function to append all files
    appState = "READY";
  });

  // add source buffer when video is ready
  onMount(() => {
    video.src = window.URL.createObjectURL(mediaSource);
  });

  $: {
    console.log(appState);
  }

  function handleChooseOption(event: CustomEvent) {
    chosenOption = event.detail;
    console.log("user has chosen", chosenOption);
    appState = "APPEND_NEXT_SEG";
  }

  function start() {
    appState = "INIT_SEGMENT";
    video.play();
    loop();
  }

  function loop() {
    loopID = window.requestAnimationFrame(loop);
    currentTime = video.currentTime * 1000; // seconds or miliseconds
    switch (appState) {
      case "INIT_SEGMENT":
        lastTime = currentTime;
        lastSegmentMark = currentTime;

        appState = "WAIT_FOR_PROMPT";
        // only set variables if we're not in the first iteration
        if (chosenOption.name === "__empty__") return;

        currentSegment = sample.segments.find(
          (s) => s.name === chosenOption.goto
        );

        if (currentSegment.isFinal) {
          appState = "WAITING_FOR_END";
          mediaSource.endOfStream();
        }
        
        console.log("current segment is", currentSegment.name);
        break;

      case "WAIT_FOR_PROMPT":
        if (currentTime - lastTime >= currentSegment.promptIn) {
          appState = "ONGOING_PROMPT";
          console.log("decision prompt is here");
          lastTime = currentTime;
        }
        break;

      case "ONGOING_PROMPT":
        if (currentTime - lastTime >= currentSegment.decisionTimeout) {
          // pick random option
          console.log("timeout, picking random option");
          chosenOption =
            currentSegment.options[
              Math.floor(Math.random() * currentSegment.options.length)
            ];
          lastTime = currentTime;
          appState = "APPEND_NEXT_SEG";
        }
        break;

      case "APPEND_NEXT_SEG":
        // return if we can't update right now;
        if (sourceBuffer.updating || sourceBuffer.buffered.length <= 0) break;
        // Append the video segments and adjust the timestamp offset
        // forward

        sourceBuffer.timestampOffset = sourceBuffer.buffered.end(
          sourceBuffer.buffered.length - 1
        );

        const nextSegment = sample.segments.find(
          (s) => s.name === chosenOption.goto
        );

        if (nextSegment.files[appendThisBufferNumber]) {
          console.log("appending", nextSegment.files[appendThisBufferNumber]);
          sourceBuffer.appendBuffer(
            buffers.get(nextSegment.files[appendThisBufferNumber])
          );
          appendThisBufferNumber++;
        } else {
          console.log("done appending");
          appendThisBufferNumber = 0;
          appState = "WAITING_FOR_NEXT_SEG";
        }
        break;

      case "WAITING_FOR_NEXT_SEG":
        if (currentTime - lastSegmentMark >= currentSegment.nextSegmentIn)
          appState = "INIT_SEGMENT";
        break;

      case "WAITING_FOR_END":
        if (video.ended) appState = "END";
        break;

      case "END":
        // mediaSource.endOfStream();
        cancelAnimationFrame(loopID);
        console.log('the end.');
        console.log('%c*shows dialog buttons*', 'font-style: italic;')
        break;

      default:
        console.log("unrecognized state: ", appState);
        break;
    }
  }
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video controls bind:this={video}/>
{#if appState === 'READY'}<button on:click={start}>bora</button>{/if}

<br />
espaço pro componente de decisão do prompt
{#if appState === 'ONGOING_PROMPT'}
  <DecisionPrompt
    options={currentSegment.options}
    on:chosen={handleChooseOption} />
{/if}

debug:
<br />
{appState}
<br />
{currentTime}
<br />
{JSON.stringify(currentSegment)}
