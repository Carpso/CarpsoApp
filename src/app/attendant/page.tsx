// src/app/attendant/page.tsx
'use client';

import React, { useState, useCallback, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Car, Phone, User, AlertTriangle, ShieldOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppStateContext } from '@/context/AppStateProvider';
import { searchUserOrVehicleByAttendant, AttendantSearchResult } from '@/services/user-service';
import { useRouter } from 'next/navigation';

export default function AttendantDashboardPage() {
  const { isAuthenticated, userRole } = useContext(AppStateContext)!;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AttendantSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState(''); // To avoid redundant searches
  const { toast } = useToast();
  const router = useRouter();

  // Authorization check
  if (typeof window !== 'undefined' && (!isAuthenticated || userRole !== 'ParkingAttendant')) {
      // This should ideally redirect server-side or via middleware,
      // but client-side check as fallback.
       if (isAuthenticated) {
            toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
       } else {
             toast({ title: "Authentication Required", description: "Please sign in as an attendant.", variant: "destructive" });
       }
       router.push('/'); // Redirect unauthorized users
       return ( // Render null or a loading/redirect message while redirecting
          <div className="container py-8 px-4 md:px-6 lg:px-8 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p>Redirecting...</p>
          </div>
       );
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery === lastSearchQuery) return; // Don't search if query is empty or unchanged

    setIsLoading(true);
    setLastSearchQuery(searchQuery); // Store the query being searched
    setSearchResults([]); // Clear previous results
    try {
      const results = await searchUserOrVehicleByAttendant(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast({ title: "No Results", description: `No users or vehicles found matching "${searchQuery}".` });
      }
    } catch (error) {
      console.error("Error during attendant search:", error);
      toast({ title: "Search Error", description: "Could not perform search. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, lastSearchQuery, toast]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <User className="h-6 w-6 text-primary" />
            Attendant Dashboard
          </CardTitle>
          <CardDescription>
            Search for user or vehicle details by license plate or phone number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="flex w-full items-center space-x-2 mb-6">
            <Input
              type="text"
              placeholder="Enter License Plate or Phone Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-grow"
            />
            <Button onClick={handleSearch} disabled={isLoading || !searchQuery || searchQuery === lastSearchQuery}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>

          {/* Search Results Table */}
          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : searchResults.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Vehicle</TableHead>
                    {/* Add other relevant columns if needed */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((result, index) => (
                    <TableRow key={`${result.userId}-${result.vehiclePlate}-${index}`}>
                      <TableCell className="font-medium">{result.userName}</TableCell>
                      <TableCell>{result.phone || 'N/A'}</TableCell>
                      <TableCell>
                         <Badge variant="secondary">{result.vehiclePlate}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                          {result.vehicleMake && result.vehicleModel
                              ? `${result.vehicleMake} ${result.vehicleModel}`
                              : 'N/A'}
                      </TableCell>
                      {/* Actions column if needed, e.g., view details */}
                       {/* <TableCell className="text-right">
                           <Button variant="ghost" size="sm">View</Button>
                       </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : lastSearchQuery ? ( // Only show "No results" if a search was actually performed
               <p className="text-muted-foreground text-center py-4">No results found for "{lastSearchQuery}".</p>
            ) : (
                 <p className="text-muted-foreground text-center py-4">Enter a license plate or phone number to start searching.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
