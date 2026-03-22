package ilink

import (
	"bytes"
	"testing"

	"github.com/youthlin/silk"
)

func TestSilkEncodeDecodeRoundTrip(t *testing.T) {
	// Generate a simple 16-bit PCM at 24kHz, 1 second of silence
	sampleRate := 24000
	duration := 1 // seconds
	numSamples := sampleRate * duration
	pcm := make([]byte, numSamples*2) // 16-bit = 2 bytes per sample

	// Encode PCM → SILK without STX
	silkNoStx, err := silk.Encode(bytes.NewReader(pcm), silk.SampleRate(sampleRate))
	if err != nil {
		t.Fatalf("encode without stx: %v", err)
	}
	t.Logf("SILK without STX: %d bytes, header: %x", len(silkNoStx), silkNoStx[:min(10, len(silkNoStx))])

	// Encode PCM → SILK with STX (WeChat compatible)
	silkWithStx, err := silk.Encode(bytes.NewReader(pcm), silk.SampleRate(sampleRate), silk.Stx(true))
	if err != nil {
		t.Fatalf("encode with stx: %v", err)
	}
	t.Logf("SILK with STX: %d bytes, header: %x", len(silkWithStx), silkWithStx[:min(10, len(silkWithStx))])

	// Verify STX version starts with 0x02
	if silkWithStx[0] != 0x02 {
		t.Errorf("STX version should start with 0x02, got 0x%02x", silkWithStx[0])
	}

	// Verify non-STX version starts with SILK header "#!SILK_V3"
	silkHeader := "#!SILK_V3"
	if !bytes.HasPrefix(silkNoStx, []byte(silkHeader)) {
		t.Errorf("non-STX should start with %q, got %x", silkHeader, silkNoStx[:9])
	}

	// Decode STX version back to PCM
	decoded, err := silk.Decode(bytes.NewReader(silkWithStx), silk.WithSampleRate(sampleRate))
	if err != nil {
		t.Fatalf("decode stx silk: %v", err)
	}
	t.Logf("decoded PCM: %d bytes (original: %d)", len(decoded), len(pcm))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
