// Collects microphone samples and hands them to the page in blocks.
// Audio stays in memory on this device and is never sent anywhere (D-019).
class OgbifoRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.block = new Float32Array(4096);
    this.filled = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let i = 0; i < channel.length; i += 1) {
        this.block[this.filled] = channel[i];
        this.filled += 1;
        if (this.filled === this.block.length) {
          this.port.postMessage(this.block, [this.block.buffer]);
          this.block = new Float32Array(4096);
          this.filled = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("ogbifo-recorder", OgbifoRecorder);
