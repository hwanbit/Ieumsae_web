import { useRef, useEffect } from "react";
import Hls from "hls.js";

function HLSPlayer() {
    const videoRef = useRef(null); // 초기값 null 추가

    useEffect(() => {
        console.log("videoRef.current:", videoRef.current); // 디버깅용
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource("http://192.168.25.141/hls/stream.m3u8");
            hls.attachMedia(videoRef.current);
            return () => hls.destroy();
        } else if (videoRef.current && videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
            videoRef.current.src = "http://192.168.25.141/hls/stream.m3u8";
        }
    }, []);

    return (
        <video ref={videoRef} controls autoPlay style={{ width: "640px" }} />
    );
}

export default HLSPlayer;