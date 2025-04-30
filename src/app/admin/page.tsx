// src/app/admin/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, UserCog, LayoutDashboard, BarChart, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


// TODO: Protect this route/page to be accessible only by users with the 'Admin' role.
// This usually involves authentication and role checks in middleware or using a layout HOC.

// Placeholder data - replace with actual data fetching
const sampleUsers = [
  { id: 'usr_1', name: 'Alice Smith', email: 'alice@example.com', role: 'User' },
  { id: 'usr_2', name: 'Bob Johnson', email: 'bob@example.com', role: 'ParkingLotOwner' },
  { id: 'usr_3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'User' },
  { id: 'usr_4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin' },
];

const sampleLots = [
    { id: 'lot_A', name: 'Downtown Garage', capacity: 150, currentOccupancy: 110 },
    { id: 'lot_B', name: 'Airport Lot B', capacity: 300, currentOccupancy: 250 },
    { id: 'lot_C', name: 'Mall Parking Deck', capacity: 500, currentOccupancy: 480 },
];

export default function AdminDashboardPage() {
  return (
    <div className="container py-8 px-4 md:px-6 lg:px-8">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
             <ShieldCheck className="h-6 w-6 text-primary" />
             Admin Dashboard
          </CardTitle>
          <CardDescription>
            Manage users, parking lots, system settings, and view overall analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="users" className="w-full">
             <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
               <TabsTrigger value="users"><UserCog className="mr-2 h-4 w-4"/>Users</TabsTrigger>
               <TabsTrigger value="lots"><LayoutDashboard className="mr-2 h-4 w-4"/>Parking Lots</TabsTrigger>
               <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4"/>Analytics</TabsTrigger>
               <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/>Settings</TabsTrigger>
             </TabsList>

             {/* User Management Tab */}
             <TabsContent value="users">
               <Card>
                 <CardHeader>
                   <CardTitle>User Management</CardTitle>
                   <CardDescription>View, edit, or remove users and manage their roles.</CardDescription>
                    <div className="flex items-center gap-2 pt-4">
                        <Input placeholder="Search users..." className="max-w-sm" />
                        <Button>Search</Button>
                        <Button variant="outline" className="ml-auto">Add New User</Button>
                    </div>
                 </CardHeader>
                 <CardContent>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Name</TableHead>
                         <TableHead>Email</TableHead>
                         <TableHead>Role</TableHead>
                         <TableHead className="text-right">Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {sampleUsers.map((user) => (
                         <TableRow key={user.id}>
                           <TableCell className="font-medium">{user.name}</TableCell>
                           <TableCell>{user.email}</TableCell>
                           <TableCell>{user.role}</TableCell>
                           <TableCell className="text-right">
                             <Button variant="ghost" size="sm">Edit</Button>
                             <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">Delete</Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Parking Lot Management Tab */}
              <TabsContent value="lots">
               <Card>
                 <CardHeader>
                   <CardTitle>Parking Lot Management</CardTitle>
                   <CardDescription>Monitor status and manage all parking lots.</CardDescription>
                    <div className="flex items-center gap-2 pt-4">
                        <Input placeholder="Search lots..." className="max-w-sm" />
                        <Button>Search</Button>
                         <Button variant="outline" className="ml-auto">Add New Lot</Button>
                    </div>
                 </CardHeader>
                 <CardContent>
                    <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Lot Name</TableHead>
                         <TableHead>Capacity</TableHead>
                         <TableHead>Current Occupancy</TableHead>
                          <TableHead>Status</TableHead>
                         <TableHead className="text-right">Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {sampleLots.map((lot) => (
                         <TableRow key={lot.id}>
                           <TableCell className="font-medium">{lot.name}</TableCell>
                           <TableCell>{lot.capacity}</TableCell>
                           <TableCell>{lot.currentOccupancy}</TableCell>
                           <TableCell>{((lot.currentOccupancy / lot.capacity) * 100).toFixed(0)}% Full</TableCell>
                           <TableCell className="text-right">
                              <Button variant="ghost" size="sm">View Details</Button>
                             <Button variant="ghost" size="sm">Edit</Button>
                             <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">Disable</Button>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Analytics Tab */}
             <TabsContent value="analytics">
               <Card>
                 <CardHeader>
                   <CardTitle>System Analytics</CardTitle>
                   <CardDescription>View overall system performance and financial reports.</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">Placeholder for charts and key metrics (e.g., total revenue, peak hours, average occupancy rates).</p>
                   {/* TODO: Add chart components here */}
                   <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                       <Card>
                           <CardHeader><CardTitle className="text-lg">$1,234.56</CardTitle><CardDescription>Revenue Today</CardDescription></CardHeader>
                       </Card>
                        <Card>
                           <CardHeader><CardTitle className="text-lg">75%</CardTitle><CardDescription>Avg. Occupancy (24h)</CardDescription></CardHeader>
                       </Card>
                        <Card>
                           <CardHeader><CardTitle className="text-lg">15</CardTitle><CardDescription>Active Reservations</CardDescription></CardHeader>
                       </Card>
                   </div>
                 </CardContent>
               </Card>
             </TabsContent>

             {/* Settings Tab */}
             <TabsContent value="settings">
               <Card>
                 <CardHeader>
                   <CardTitle>System Settings</CardTitle>
                   <CardDescription>Configure application settings, integrations, and pricing rules.</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground">Placeholder for various system configuration options.</p>
                    {/* Example setting */}
                     <div className="mt-4 space-y-4">
                       <div className="flex items-center justify-between p-4 border rounded-md">
                          <div>
                            <p className="font-medium">Base Reservation Fee</p>
                            <p className="text-sm text-muted-foreground">The standard fee applied to each parking reservation.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">$</span>
                            <Input type="number" defaultValue="2.50" step="0.01" className="w-24" />
                             <Button size="sm">Save</Button>
                          </div>
                       </div>
                         <div className="flex items-center justify-between p-4 border rounded-md">
                          <div>
                            <p className="font-medium">Payment Gateway Integration</p>
                            <p className="text-sm text-muted-foreground">Connect to Stripe, PayPal, etc.</p>
                          </div>
                          <Button size="sm" variant="outline">Configure</Button>
                       </div>
                       {/* Add more settings forms here */}
                    </div>
                 </CardContent>
               </Card>
             </TabsContent>
           </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
