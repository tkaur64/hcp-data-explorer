import { createAsyncThunk } from "@reduxjs/toolkit";

import type { HcpRowKey } from "../../../domain/hcp";
import { validateCalls } from "../../../infrastructure/provided/mock-validator";

export interface SubmitCallsEditArgs {
  rowKey: HcpRowKey;
  newValue: number;
}

export const submitCallsEdit = createAsyncThunk<
  SubmitCallsEditArgs,
  SubmitCallsEditArgs,
  {
    rejectValue: string;
  }
>(
  "explorer/submitCallsEdit",
  async ({ rowKey, newValue }, { rejectWithValue }) => {
    if (
      !Number.isFinite(newValue) ||
      !Number.isInteger(newValue) ||
      newValue < 0
    ) {
      return rejectWithValue("Calls must be a non-negative whole number");
    }

    try {
      await validateCalls(newValue);

      return {
        rowKey,
        newValue,
      };
    } catch (error) {
      if (typeof error === "string") {
        return rejectWithValue(error);
      }

      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }

      return rejectWithValue("Calls validation failed");
    }
  },
);
