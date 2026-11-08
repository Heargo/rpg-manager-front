import { TestBed } from '@angular/core/testing';
import { OnlineBusiness } from './online.business';

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
}

describe('OnlineBusiness', () => {
  afterEach(() => setNavigatorOnline(true));

  it('starts online when the browser says so', () => {
    setNavigatorOnline(true);
    expect(TestBed.inject(OnlineBusiness).$online()).toBe(true);
  });

  it('starts offline when the browser is already offline', () => {
    setNavigatorOnline(false);
    expect(TestBed.inject(OnlineBusiness).$online()).toBe(false);
  });

  it('goes offline on the offline event and back online on the online event', () => {
    setNavigatorOnline(true);
    const business = TestBed.inject(OnlineBusiness);

    window.dispatchEvent(new Event('offline'));
    expect(business.$online()).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(business.$online()).toBe(true);
  });
});
