'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, BrainCircuit, TrendingUp, CheckCircle } from 'lucide-react';
import { predictParkingAvailability, PredictParkingAvailabilityInput, PredictParkingAvailabilityOutput } from '@/ai/flows/predict-parking-availability'; // Adjust import path as needed
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"


const predictionFormSchema = z.object({
  spotId: z.string().min(1, { message: 'Spot ID is required.' }),
  historicalData: z.string().min(10, { message: 'Please provide some historical occupancy data (e.g., timestamps of arrivals/departures, occupancy percentages per hour). Minimum 10 characters.' }),
  trends: z.string().optional().describe('Optional: Any known trends or events (e.g., "Holiday weekend", "Concert nearby at 7 PM", "Normal weekday afternoon").'),
});

type PredictionFormValues = z.infer<typeof predictionFormSchema>;

export default function PredictionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictParkingAvailabilityOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PredictionFormValues>({
    resolver: zodResolver(predictionFormSchema),
    defaultValues: {
      spotId: '',
      historicalData: '',
      trends: '',
    },
     mode: "onChange", // Validate on change for better UX
  });

  async function onSubmit(data: PredictionFormValues) {
    setIsLoading(true);
    setError(null);
    setPredictionResult(null);
    console.log("Submitting data:", data);

    try {
      const result = await predictParkingAvailability({
          spotId: data.spotId,
          historicalData: data.historicalData,
          trends: data.trends || 'No specific trends provided.', // Ensure trends is always a string
      });
      console.log("Prediction result:", result);
      setPredictionResult(result);
    } catch (err) {
       console.error('Prediction failed:', err);
       let errorMessage = 'An unexpected error occurred during prediction.';
       if (err instanceof Error) {
         errorMessage = `Prediction error: ${err.message}`;
       } else if (typeof err === 'string') {
         errorMessage = err;
       }
       setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          Predict Parking Availability
        </CardTitle>
        <CardDescription>
          Use historical data and trends to forecast the likelihood of a parking spot being available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="spotId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parking Spot ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., A15, Level2-Spot30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="historicalData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Historical Occupancy Data</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe past usage patterns, e.g., 'Usually occupied 9 AM - 5 PM weekdays', 'Free on weekends', 'Occupancy: Mon 9AM: 80%, Mon 1PM: 95%, Tue 9AM: 75%...'"
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trends"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Trends/Events (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 'Local festival this Saturday', 'Rainy day', 'Mid-morning Tuesday'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Predicting...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Predict Availability
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex flex-col items-start gap-4 pt-6">
          {error && (
             <Alert variant="destructive">
               <AlertTitle>Prediction Failed</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
           )}
          {predictionResult && (
            <Alert variant="default" className="w-full bg-secondary">
               <CheckCircle className="h-4 w-4"/>
               <AlertTitle className="font-semibold">Prediction Result for Spot {form.getValues('spotId')}</AlertTitle>
               <AlertDescription>
                 <p>Predicted Availability: <span className="font-medium">{(predictionResult.predictedAvailability * 100).toFixed(0)}%</span></p>
                 <p>Confidence Level: <span className="font-medium capitalize">{predictionResult.confidenceLevel}</span></p>
                 <p className="mt-2 text-xs text-muted-foreground">Factors considered: {predictionResult.factors}</p>
               </AlertDescription>
            </Alert>
          )}
       </CardFooter>
    </Card>
  );
}
