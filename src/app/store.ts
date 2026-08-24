import { configureStore } from "@reduxjs/toolkit";
import explorerReducer from "../features/explorer/state/explorerSlice";

export const store = configureStore({
  reducer: {
    explorer: explorerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: {
        ignoredPaths: ["explorer.entities"],
      },
      serializableCheck: {
        ignoredPaths: ["explorer.entities"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
