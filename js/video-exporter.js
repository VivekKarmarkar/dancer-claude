export class VideoExporter {
    constructor(canvas, mediaStreamDestination) {
        this.canvas = canvas;
        this.mediaStreamDest = mediaStreamDestination;
        this.mediaRecorder = null;
        this.chunks = [];
        this.isRecording = false;
    }

    startRecording() {
        const canvasStream = this.canvas.captureStream(30);
        const audioStream = this.mediaStreamDest.stream;
        const combinedStream = new MediaStream([
            ...canvasStream.getTracks(),
            ...audioStream.getTracks()
        ]);

        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            mimeType = 'video/webm;codecs=vp8,opus';
        }

        this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.chunks.push(event.data);
            }
        };

        this.mediaRecorder.start(100);
        this.isRecording = true;
    }

    stopRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
                this.chunks = [];
                this.isRecording = false;
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }

    static download(blob, filename = 'dancer-claude.webm') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
