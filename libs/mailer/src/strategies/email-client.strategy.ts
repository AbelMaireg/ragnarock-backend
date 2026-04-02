import { SendEmailInput } from "../types/email.types";

export interface EmailClientStrategy {
  send(input: SendEmailInput): Promise<void>;
}
