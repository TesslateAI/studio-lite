'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Creator {
  id: number;
  code: string;
  displayName: string | null;
  plusCommissionPercent: string;
  proCommissionPercent: string;
  freeMonthsPlus: number;
  isActive: boolean;
  totalEarnings: number;
  totalRedemptions: number;
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

interface User {
  id: string;
  email: string | null;
  name: string | null;
}

export default function CreatorCodesManager({
  creators,
  users,
}: {
  creators: Creator[];
  users: User[];
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  
  const [formData, setFormData] = useState({
    userId: '',
    displayName: '',
    plusCommissionPercent: 5,
    proCommissionPercent: 15,
    freeMonthsPlus: 1,
  });
  
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/creator-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) throw new Error('Failed to create creator');
      
      toast.success('Creator code created successfully');
      setIsCreateOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to create creator code');
    }
  };
  
  const handleUpdate = async () => {
    if (!selectedCreator) return;
    
    try {
      const response = await fetch('/api/creator-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorProfileId: selectedCreator.id,
          plusCommissionPercent: parseFloat(selectedCreator.plusCommissionPercent),
          proCommissionPercent: parseFloat(selectedCreator.proCommissionPercent),
          freeMonthsPlus: selectedCreator.freeMonthsPlus,
          isActive: selectedCreator.isActive,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update creator');
      
      toast.success('Creator updated successfully');
      setIsEditOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to update creator');
    }
  };
  
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/pricing?creator=${code}`);
    toast.success('Creator link copied to clipboard');
  };
  
  const availableUsers = users.filter(
    user => !creators.find(creator => creator.user.id === user.id)
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Manage creator codes and commission settings
        </p>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Creator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Creator Code</DialogTitle>
              <DialogDescription>
                Generate a unique creator code for an influencer
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user">Select User</Label>
                <Select
                  value={formData.userId}
                  onValueChange={(value) => setFormData({ ...formData, userId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email} {user.name && `(${user.name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Creator's public name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plusCommission">Plus Commission %</Label>
                  <Input
                    id="plusCommission"
                    type="number"
                    value={formData.plusCommissionPercent}
                    onChange={(e) => setFormData({ ...formData, plusCommissionPercent: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="proCommission">Pro Commission %</Label>
                  <Input
                    id="proCommission"
                    type="number"
                    value={formData.proCommissionPercent}
                    onChange={(e) => setFormData({ ...formData, proCommissionPercent: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="freeMonths">Free Months (Plus)</Label>
                <Input
                  id="freeMonths"
                  type="number"
                  value={formData.freeMonthsPlus}
                  onChange={(e) => setFormData({ ...formData, freeMonthsPlus: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Creator</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Commission (Plus/Pro)</TableHead>
              <TableHead>Free Months</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creators.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{creator.displayName || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{creator.user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{creator.code}</code>
                </TableCell>
                <TableCell>
                  {creator.plusCommissionPercent}% / {creator.proCommissionPercent}%
                </TableCell>
                <TableCell>{creator.freeMonthsPlus}</TableCell>
                <TableCell>{creator.totalRedemptions}</TableCell>
                <TableCell>${(creator.totalEarnings / 100).toFixed(2)}</TableCell>
                <TableCell>
                  <span className={`text-sm ${creator.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {creator.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(creator.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedCreator(creator);
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Creator Settings</DialogTitle>
            <DialogDescription>
              Update commission rates and settings for {selectedCreator?.displayName || selectedCreator?.user.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCreator && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editPlusCommission">Plus Commission %</Label>
                  <Input
                    id="editPlusCommission"
                    type="number"
                    value={selectedCreator.plusCommissionPercent}
                    onChange={(e) => setSelectedCreator({
                      ...selectedCreator,
                      plusCommissionPercent: e.target.value,
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editProCommission">Pro Commission %</Label>
                  <Input
                    id="editProCommission"
                    type="number"
                    value={selectedCreator.proCommissionPercent}
                    onChange={(e) => setSelectedCreator({
                      ...selectedCreator,
                      proCommissionPercent: e.target.value,
                    })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editFreeMonths">Free Months (Plus)</Label>
                <Input
                  id="editFreeMonths"
                  type="number"
                  value={selectedCreator.freeMonthsPlus}
                  onChange={(e) => setSelectedCreator({
                    ...selectedCreator,
                    freeMonthsPlus: parseInt(e.target.value) || 0,
                  })}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="editActive"
                  checked={selectedCreator.isActive}
                  onCheckedChange={(checked) => setSelectedCreator({
                    ...selectedCreator,
                    isActive: checked,
                  })}
                />
                <Label htmlFor="editActive">Active</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}