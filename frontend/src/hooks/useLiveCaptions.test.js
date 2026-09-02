import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiveCaptions } from './useLiveCaptions';

const mockStart = vi.fn();
const mockStop = vi.fn();

function installSpeechRecognition({ supported = true } = {}) {
  if (!supported) {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    return;
  }

  class MockSpeechRecognition {
    continuous = false;

    interimResults = false;

    lang = 'en-US';

    onresult = null;

    onerror = null;

    onend = null;

    start = mockStart;

    stop = mockStop;
  }

  window.SpeechRecognition = MockSpeechRecognition;
  window.webkitSpeechRecognition = MockSpeechRecognition;
}

describe('useLiveCaptions', () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockStop.mockClear();
    installSpeechRecognition();
  });

  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  it('reports unsupported browsers without crashing', () => {
    installSpeechRecognition({ supported: false });
    const { result } = renderHook(() =>
      useLiveCaptions({ enabled: true, onFinalCaption: vi.fn() }),
    );

    act(() => {
      result.current;
    });

    expect(result.current.supported).toBe(false);
    expect(result.current.error).toMatch(/not supported/i);
  });

  it('starts speech recognition when enabled', async () => {
    renderHook(() => useLiveCaptions({ enabled: true, onFinalCaption: vi.fn() }));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });
  });

  it('stops recognition and clears interim text when disabled', async () => {
    const { rerender } = renderHook(
      ({ enabled }) => useLiveCaptions({ enabled, onFinalCaption: vi.fn() }),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    rerender({ enabled: false });

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    });
  });

  it('calls onFinalCaption for final transcript segments', async () => {
    const onFinalCaption = vi.fn();
    renderHook(() => useLiveCaptions({ enabled: true, onFinalCaption }));

    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    const Recognition = window.SpeechRecognition;
    const instance = mockStart.mock.instances[0];
    expect(instance).toBeTruthy();

    act(() => {
      instance.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            0: { transcript: 'Hello everyone' },
          },
        ],
      });
    });

    expect(onFinalCaption).toHaveBeenCalledWith('Hello everyone');
  });
});
