import { Component, createRef } from "inferno";

interface TerminalAudioPlayerProps {
  src: string;
  label?: string;
}

interface TerminalAudioPlayerState {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export class TerminalAudioPlayer extends Component<TerminalAudioPlayerProps, TerminalAudioPlayerState> {
  private audioRef = createRef<HTMLAudioElement>();
  private barRef = createRef<HTMLDivElement>();

  state: TerminalAudioPlayerState = {
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
  };

  componentDidMount() {
    const audio = this.audioRef.current;
    if (audio) {
      audio.volume = this.state.volume;
    }
  }

  componentDidUpdate(_prevProps: TerminalAudioPlayerProps, prevState: TerminalAudioPlayerState) {
    const audio = this.audioRef.current;
    if (!audio) return;
    if (prevState.volume !== this.state.volume) {
      audio.volume = this.state.volume;
    }
  }

  private handleLoadedMetadata = () => {
    const audio = this.audioRef.current;
    if (!audio) return;
    this.setState({
      isReady: true,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    });
  };

  private handleDurationChange = () => {
    const audio = this.audioRef.current;
    if (!audio) return;
    this.setState({
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    });
  };

  private handleTimeUpdate = () => {
    const audio = this.audioRef.current;
    if (!audio) return;
    this.setState({
      currentTime: audio.currentTime,
    });
  };

  private handlePlay = () => {
    this.setState({ isPlaying: true });
  };

  private handlePause = () => {
    this.setState({ isPlaying: false });
  };

  private handleEnded = () => {
    this.setState({ isPlaying: false });
  };

  private togglePlayback = async () => {
    const audio = this.audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Audio playback failed", error);
      }
      return;
    }
    audio.pause();
  };

  private handleVolumeChange = (event: Event) => {
    const audio = this.audioRef.current;
    const target = event.currentTarget as HTMLInputElement;
    const nextValue = Number.parseFloat(target.value);
    if (!audio || Number.isNaN(nextValue)) return;
    audio.volume = nextValue;
    this.setState({ volume: nextValue });
  };

  private handleSeek = (event: MouseEvent) => {
    const audio = this.audioRef.current;
    const bar = this.barRef.current;
    if (!audio || !bar || !audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, ratio));
    audio.currentTime = clamped * audio.duration;
    this.setState({ currentTime: audio.currentTime });
  };

  render() {
    const { src, label } = this.props;
    const { isReady, isPlaying, currentTime, duration, volume } = this.state;
    const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const buttonLabel = isPlaying ? "Pause" : "Play";
    const headerLabel = label ?? "Audio attachment";

    return (
      <div className="grid gap-2 py-[10px] px-[12px] w-full sm:w-auto max-w-[340px] text-[#bff7d1] bg-(--terminal-audio-bg) border border-(--terminal-audio-border) border-solid rounded-md shadow-(--terminal-audio-box-shadow)" role="group" aria-label={headerLabel}>
        <div className="flex justify-between items-center uppercase text-[#86efac] text-[0.7rem] tracking-[0.12em]">
          <span className="text-[#bff7d1]">{headerLabel}</span>
          <button
            type="button"
            className="font-[inherit] uppercase tracking-[0.18em] py-[4px] px-[10px] text-[0.7rem] text-[#d7ffe5] cursor-pointer border rounded-[3px] border-solid border-(--terminal-audio-button-border) bg-(--terminal-audio-button-bg) hover:bg-(--terminal-audio-button-bg-hover)"
            onClick={this.togglePlayback}
            aria-pressed={isPlaying}
          >
            {buttonLabel}
          </button>
        </div>
        <div
          className="relative h-[6px] rounded-[3px] bg-(--terminal-audio-bar-bg) border border-solid border-(--terminal-audio-bar-border) cursor-pointer overflow-hidden"
          onClick={this.handleSeek}
          ref={this.barRef}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 w-0 bg-(image:--terminal-audio-bar-fill-bg) shadow-(--terminal-audio-bar-fill-box-shadow)"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[0.65rem] tracking-[0.12em] text-[#9fe7b7] uppercase">
          <span>{formatTime(currentTime)}</span>
          <span>{isReady ? formatTime(duration) : "--:--"}</span>
        </div>
        <div className="flex items-center gap-2 text-[0.65rem] tracking-[0.12em] uppercase text-[#9fe7b7]">
          <span className="min-w-[3ch]">VOL</span>
          <input
            className="terminal-audio__volume-slider w-full h-[4px] bg-(--terminal-audio-volume-slider-bg) border border-solid border-(--terminal-audio-volume-slider-border) rounded-[3px] appearance-none accent-[#22c55e]"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onInput={this.handleVolumeChange}
            aria-label="Volume"
          />
        </div>
        <audio
          ref={this.audioRef}
          className="hidden"
          src={src}
          preload="metadata"
          onLoadedMetadata={this.handleLoadedMetadata}
          onDurationChange={this.handleDurationChange}
          onTimeUpdate={this.handleTimeUpdate}
          onPlay={this.handlePlay}
          onPause={this.handlePause}
          onEnded={this.handleEnded}
        />
      </div>
    );
  }
}

function formatTime(time: number): string {
  if (!Number.isFinite(time)) return "--:--";
  const totalSeconds = Math.max(0, Math.floor(time));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
