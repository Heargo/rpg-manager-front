import { TestBed } from '@angular/core/testing';
import { QrScanError, QrScannerService } from './qr-scanner.service';

describe('QrScannerService', () => {
  const track = { stop: vi.fn() };
  const getUserMedia = vi.fn();
  const video = document.createElement('video');

  beforeEach(() => {
    track.stop.mockClear();
    getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [track] });
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });
    video.play = vi.fn(async () => undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('asks for the rear camera and stops its tracks', async () => {
    const session = await TestBed.inject(QrScannerService).start(
      video,
      () => undefined,
    );
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' },
      audio: false,
    });
    session.stop();
    expect(track.stop).toHaveBeenCalled();
  });

  it('falls back to jsqr when BarcodeDetector cannot be constructed', async () => {
    vi.stubGlobal(
      'BarcodeDetector',
      class {
        static getSupportedFormats = async () => ['qr_code'];
        constructor() {
          throw new Error('nope');
        }
      },
    );
    const session = await TestBed.inject(QrScannerService).start(
      video,
      () => undefined,
    );
    session.stop();
    expect(track.stop).toHaveBeenCalled();
  });

  it('reports a denied permission', async () => {
    getUserMedia.mockRejectedValue(
      Object.assign(new Error('x'), { name: 'NotAllowedError' }),
    );
    await expect(
      TestBed.inject(QrScannerService).start(video, () => undefined),
    ).rejects.toEqual(new QrScanError('denied'));
  });

  it('reports a missing camera', async () => {
    getUserMedia.mockRejectedValue(
      Object.assign(new Error('x'), { name: 'NotFoundError' }),
    );
    await expect(
      TestBed.inject(QrScannerService).start(video, () => undefined),
    ).rejects.toMatchObject({
      reason: 'no-camera',
    });
  });
});
