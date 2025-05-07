// src/app/help/page.tsx
'use client';

import React, { useState } from 'react'; // Added useState import
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LifeBuoy, Search, Mic, Square, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FAQItem {
  question: string;
  answer: React.ReactNode; // Can be string or JSX for more complex answers
}

const faqs: FAQItem[] = [
  {
    question: "How do I sign up for a Carpso account?",
    answer: (
      <>
        <p>You can sign up using several methods:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Email & Password:</strong> Enter your name, primary license plate, owner's phone, email, and create a password.</li>
          <li><strong>Phone Number:</strong> Enter your name, primary license plate, owner's phone, and phone number. You'll receive an OTP to verify.</li>
          <li><strong>Social Logins:</strong> Use your Google, Facebook, or Apple account for a quick sign-up.</li>
        </ul>
        <p className="mt-2">You'll also be asked to select an account type (User, Parking Lot Owner, or Admin - Admin requires an authorization code).</p>
      </>
    ),
  },
  {
    question: "How do I find available parking spots?",
    answer: (
      <>
        <p>On the 'Home' screen (Carpso Map):</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Use the location selector to choose a parking lot.</li>
          <li>The map will display parking spots. Green spots (<span className="text-green-600 font-semibold">Car icon</span>) are available. Red spots (<span className="text-red-600 font-semibold">Ban icon</span>) are occupied.</li>
          <li>Click on a green spot to view details and reserve it.</li>
          <li>You can also use the AI recommendations or voice commands like "Hey Carpso, find parking near [destination]".</li>
        </ol>
      </>
    ),
  },
  {
    question: "How do I reserve a parking spot?",
    answer: (
      <>
        <p>Once you've selected an available spot on the map:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>A dialog will pop up with spot details, estimated cost, and availability prediction.</li>
          <li>You have 60 seconds to confirm. Slide the 'Slide to Confirm' bar to the right.</li>
          <li>If successful, you'll receive a confirmation and a digital parking ticket with a QR code.</li>
        </ol>
        <p className="mt-2">Note: Reservations are primarily for Carpso-managed lots.</p>
      </>
    ),
  },
  {
    question: "How do I pay for parking?",
    answer: (
      <>
        <p>Carpso supports various payment methods, managed in your Profile:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Carpso Wallet:</strong> Top up your in-app wallet and use it for seamless payments.</li>
          <li><strong>Mobile Money:</strong> Link your MTN, Airtel, or Zamtel mobile money accounts.</li>
          <li><strong>Cards:</strong> Add your Visa or Mastercard debit/credit cards.</li>
          <li><strong>Points Redemption:</strong> You can redeem your loyalty points for wallet credit.</li>
        </ul>
        <p className="mt-2">Parking fees are calculated based on duration and dynamic pricing rules (e.g., peak hours, events, user tier discounts).</p>
      </>
    ),
  },
  {
    question: "What is the Carpso Wallet and how do I use it?",
    answer: (
      <>
        <p>The Carpso Wallet is an in-app digital wallet. You can:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Top Up:</strong> Add funds using Mobile Money or Cards.</li>
          <li><strong>Send Money:</strong> Transfer funds to other Carpso users.</li>
          <li><strong>Pay for Others:</strong> Pay parking fees for another user's vehicle.</li>
          <li><strong>Pay for Parking:</strong> Use your wallet balance to pay for your parking sessions.</li>
        </ul>
        <p className="mt-2">Your wallet balance and transaction history are available in your Profile.</p>
      </>
    ),
  },
  {
    question: "How do I report an issue with a parking spot (e.g., reserved spot is occupied)?",
    answer: (
      <>
        <p>If you find your reserved spot occupied or encounter other issues:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Go to your <strong>Profile</strong> page.</li>
          <li>Find the active reservation under 'Active Reservations'.</li>
          <li>Click the 'Report Issue' button next to the reservation.</li>
          <li>In the modal, enter the license plate of the occupying vehicle, add details, and optionally upload a photo.</li>
          <li>Submit the report. It will be sent to the attendant, lot owner, and Carpso management.</li>
        </ol>
        <p className="mt-2">You can also use voice command: "Hey Carpso, report spot [Spot ID] is occupied."</p>
      </>
    ),
  },
  {
    question: "How does the parking spot queue system work?",
    answer: (
      <>
        <p>If a Carpso-managed spot you want is occupied:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Click on the occupied spot. A toast notification will show its status and queue length.</li>
          <li>If you're logged in and online, you can click 'Join Queue'.</li>
          <li>You'll be notified of your position. When the spot becomes available and it's your turn, you'll receive another notification (in-app for now).</li>
          <li>You can leave the queue at any time from the same toast action or by finding the spot again.</li>
        </ol>
      </>
    ),
  },
  {
    question: "Can I extend my parking time?",
    answer: (
      <>
        <p>Yes, for active parking sessions at Carpso-managed lots:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Go to your <strong>Profile</strong> page. Under 'Active Reservations', find your current session.</li>
          <li>If extensions are available for your user tier, an 'Extend Parking' button will be visible.</li>
          <li><strong>Basic Users:</strong> Typically get a limited number of free extensions (e.g., 2).</li>
          <li><strong>Premium Users:</strong> May have more or unlimited extensions.</li>
        </ul>
        <p className="mt-2">Extensions are subject to availability and potential additional costs.</p>
      </>
    ),
  },
  {
    question: "How do I use the Voice Assistant?",
    answer: (
      <>
        <p>The voice assistant helps you perform actions hands-free:</p>
        <ol className="list-decimal pl-5 mt-2 space-y-1">
          <li>Tap the microphone icon (<Mic className="inline h-4 w-4" />) on the Home screen. It will turn blue (<Square className="inline h-4 w-4 text-blue-600" />) indicating it's listening for the wake word.</li>
          <li>Say "<strong>Hey Carpso</strong>". The icon will turn green (<CheckSquare className="inline h-4 w-4 text-green-600" />) indicating it's activated and ready for your command.</li>
          <li>Speak your command, e.g., "Find parking near East Park Mall", "Reserve spot A5", "Get directions home".</li>
          <li>To stop the voice assistant, say "<strong>Carpso stop</strong>" or tap the microphone icon again.</li>
        </ol>
        <p className="mt-2">Ensure your device has microphone permissions enabled and an internet connection for command processing.</p>
      </>
    ),
  },
  {
    question: "How do I manage my saved locations (bookmarks)?",
    answer: (
      <>
        <p>In your <strong>Profile</strong> page, under 'Saved Locations':</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Add:</strong> Click 'Add Location', fill in the label (e.g., Home, Work), address (optional), and coordinates (optional).</li>
          <li><strong>Edit:</strong> Click the edit icon next to a bookmark to modify its details.</li>
          <li><strong>Delete:</strong> Click the trash icon to remove a bookmark.</li>
        </ul>
        <p className="mt-2">Saved locations can be used with voice commands (e.g., "Hey Carpso, get directions to Work").</p>
      </>
    ),
  },
  {
    question: "What are Carpso Points and how can I use them?",
    answer: (
      <>
        <p>Carpso Points are part of our loyalty program. You can earn points by:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Daily logins.</li>
          <li>Referring new users.</li>
          <li>Participating in promotions (e.g., applying promo codes).</li>
          <li>Completing certain actions like your first booking or reporting issues.</li>
        </ul>
        <p className="mt-2">You can redeem your points for wallet credit (e.g., K 0.10 per point). You can also transfer points to other Carpso users. Manage points in your <strong>Profile</strong> under 'Rewards & Referrals'.</p>
      </>
    ),
  },
  {
    question: "How do referrals work?",
    answer: (
      <>
        <p>Share your unique referral code (found in your Profile under 'Rewards & Referrals') with friends.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>When a new user signs up using your code and completes their first parking session (simulated condition), both you and your friend may receive bonus points.</li>
          <li>Your referral history can be viewed in your profile.</li>
        </ul>
      </>
    ),
  },
  {
    question: "What are the different user roles?",
    answer: (
      <>
        <p>Carpso has several user roles:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>User:</strong> Standard access for finding, reserving, and paying for parking.</li>
          <li><strong>Parking Lot Owner:</strong> Manages their own parking lots, views analytics, sets pricing, and can add attendants for their lots.</li>
          <li><strong>Parking Attendant:</strong> On-site staff who can verify arrivals, confirm spot occupancy, and assist users.</li>
          <li><strong>Admin:</strong> System administrators with full access to manage all aspects of the app.</li>
          <li><strong>Premium User:</strong> A subscription tier for standard users, offering benefits like more parking extensions or discounts.</li>
        </ul>
      </>
    ),
  },
  {
    question: "How can I recommend a new parking lot to be added to Carpso?",
    answer: (
      <p>Go to the 'Explore' page. At the bottom, you'll find a section "Know a Parking Spot?". Fill in the parking lot's name, location/address, and any reasons why it should be added. Our team will review the recommendation.</p>
    ),
  },
  {
    question: "What if I'm offline?",
    answer: (
      <p>Carpso offers limited offline functionality. You'll see a notification if you're offline. Cached data (like parking lot lists, your profile details) may be displayed. However, real-time availability, new reservations, payments, voice commands, and other online-dependent features will be unavailable or queued until your connection is restored.</p>
    ),
  },
  // Add more FAQs as needed
];

export default function HelpCentrePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof faq.answer === 'string' && faq.answer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="inline-block bg-primary/10 p-3 rounded-full mx-auto mb-3">
             <LifeBuoy className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Help Centre</CardTitle>
          <CardDescription>
            Find answers to frequently asked questions about using Carpso.
          </CardDescription>
          <div className="mt-6 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search FAQs..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="mt-6">
          {filteredFaqs.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="prose prose-sm max-w-none text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No FAQs found matching your search term "{searchTerm}".
            </p>
          )}

            <div className="mt-12 text-center">
                <h3 className="text-lg font-semibold mb-2">Still need help?</h3>
                <p className="text-muted-foreground mb-4">
                    Contact our support team via Live Chat (in your Profile) or WhatsApp.
                </p>
                <Button variant="outline" onClick={() => { /* TODO: Link to Profile or open chat directly if possible */ alert("Navigate to Profile for chat options.")}}>
                    Go to Support Options
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
