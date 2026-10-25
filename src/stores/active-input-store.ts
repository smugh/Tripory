import { create } from 'zustand';
import { Dimensions, Platform } from 'react-native';

export interface ActiveInputData {
  id: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText?: (text: string) => void;
  nativeRef?: any;
}

interface ActiveInputStoreState {
  activeInput: ActiveInputData | null;
  activeScrollRef: any | null;
  activeScrollY: number;
  keyboardHeight: number;
  setKeyboardHeight: (h: number) => void;
  setActiveScrollRef: (ref: any | null) => void;
  setActiveScrollY: (y: number) => void;
  setActiveInput: (data: ActiveInputData) => void;
  updateActiveInputValue: (id: string, value: string) => void;
  clearActiveInput: (id?: string) => void;
  scrollInputIntoView: (inputNativeRef?: any) => void;
}

export const useActiveInputStore = create<ActiveInputStoreState>((set, get) => ({
  activeInput: null,
  activeScrollRef: null,
  activeScrollY: 0,
  keyboardHeight: 0,
  setKeyboardHeight: (h: number) => set({ keyboardHeight: h }),
  setActiveScrollRef: (ref) => set({ activeScrollRef: ref }),
  setActiveScrollY: (y) => set({ activeScrollY: y }),
  setActiveInput: (data) => set({ activeInput: data }),
  updateActiveInputValue: (id, value) =>
    set((state) => {
      if (state.activeInput && state.activeInput.id === id) {
        return { activeInput: { ...state.activeInput, value } };
      }
      return state;
    }),
  clearActiveInput: (id) =>
    set((state) => {
      if (!id || state.activeInput?.id === id) {
        return { activeInput: null };
      }
      return state;
    }),
  scrollInputIntoView: (targetInputRef) => {
    const { activeInput, activeScrollRef, activeScrollY, keyboardHeight } = get();
    const refToMeasure = targetInputRef?.current || activeInput?.nativeRef?.current;
    if (!refToMeasure || !activeScrollRef?.current?.scrollTo) return;

    const measureAndScroll = () => {
      if (!refToMeasure?.measureInWindow) return;
      refToMeasure.measureInWindow((_x: number, y: number, _w: number, height: number) => {
        if (typeof y !== 'number' || isNaN(y)) return;
        const windowHeight = Dimensions.get('window').height;
        const effectiveKbHeight = keyboardHeight > 0 ? keyboardHeight : (Platform.OS === 'android' ? 320 : 280);
        const keyboardTop = windowHeight - effectiveKbHeight;

        // If the text input is positioned lower than optimal reading area (y=180)
        // or close to the top of the virtual keyboard
        if (y > 220 || (y + height) > (keyboardTop - 60)) {
          const delta = y - 180;
          const currentY = get().activeScrollY;
          const targetY = Math.max(0, currentY + delta);
          activeScrollRef.current.scrollTo({ y: targetY, animated: true });
        }
      });
    };

    // Staggered measurements to coordinate with virtual keyboard opening animation
    setTimeout(measureAndScroll, 50);
    setTimeout(measureAndScroll, 200);
    setTimeout(measureAndScroll, 400);
  },
}));
