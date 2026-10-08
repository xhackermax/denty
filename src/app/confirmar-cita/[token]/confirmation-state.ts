export type ConfirmationState = {
  status: "idle" | "success" | "error";
  message: string;
};
