// src/app/predict/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrainCircuit, Info } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function PredictPage() {
  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8 flex justify-center items-center min-h-[calc(100vh-theme(spacing.14)*2)]">
       <Card className="w-full max-w-lg text-center">
           <CardHeader>
               <CardTitle className="flex items-center justify-center gap-2">
                   <BrainCircuit className="h-6 w-6 text-primary" />
                   Availability Prediction
               </CardTitle>
               <CardDescription>
                   Parking spot availability prediction is now integrated directly into the reservation process.
               </CardDescription>
           </CardHeader>
           <CardContent>
               <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground mb-6">
                   When you select an available parking spot on the map, you'll see its predicted availability likelihood before you confirm your reservation.
               </p>
               <Button asChild>
                   <Link href="/">Go to Parking Map</Link>
               </Button>
           </CardContent>
       </Card>
    </div>
  );
}
