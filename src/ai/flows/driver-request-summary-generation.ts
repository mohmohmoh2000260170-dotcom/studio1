'use server';
/**
 * @fileOverview A Genkit flow that generates a concise summary of a customer's delivery request for a driver.
 *
 * - driverRequestSummaryGeneration - A function that handles the generation of the summary.
 * - DriverRequestSummaryInput - The input type for the driverRequestSummaryGeneration function.
 * - DriverRequestSummaryOutput - The return type for the driverRequestSummaryGeneration function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DriverRequestSummaryInputSchema = z.object({
  customerName: z.string().describe("The customer's name."),
  customerAddress: z.string().describe("The customer's delivery address."),
  latitude: z.number().describe("The customer's latitude for delivery."),
  longitude: z.number().describe("The customer's longitude for delivery."),
  deliveryNotes: z.string().optional().describe('Any specific notes or instructions from the customer.'),
});
export type DriverRequestSummaryInput = z.infer<typeof DriverRequestSummaryInputSchema>;

const DriverRequestSummaryOutputSchema = z.string().describe('A concise summary of the delivery request for the driver.');
export type DriverRequestSummaryOutput = z.infer<typeof DriverRequestSummaryOutputSchema>;

export async function driverRequestSummaryGeneration(
  input: DriverRequestSummaryInput
): Promise<DriverRequestSummaryOutput> {
  return driverRequestSummaryGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'driverRequestSummaryPrompt',
  input: { schema: DriverRequestSummaryInputSchema },
  output: { schema: DriverRequestSummaryOutputSchema },
  prompt: `Generate a concise summary for a gas cylinder delivery driver based on the following customer request details. The summary should be easy to read and quickly convey all essential information for a driver to decide on a delivery.

Customer Name: {{{customerName}}}
Delivery Address: {{{customerAddress}}}
Coordinates: Latitude {{{latitude}}}, Longitude {{{longitude}}}
{{#if deliveryNotes}}
Delivery Notes: {{{deliveryNotes}}}
{{/if}}

Focus on brevity and clarity. Do not include any introductory or concluding phrases, just the summary itself.`,
});

const driverRequestSummaryGenerationFlow = ai.defineFlow(
  {
    name: 'driverRequestSummaryGenerationFlow',
    inputSchema: DriverRequestSummaryInputSchema,
    outputSchema: DriverRequestSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
