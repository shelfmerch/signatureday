
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Member } from '@/context/CollageContext';
import { Calendar, User, Vote } from 'lucide-react';
import { format } from 'date-fns';
import { LazyImage } from './LazyImage';

interface MemberDetailsModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            Member Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="text-center">
            <LazyImage
              src={member.photo}
              alt={member.name}
              className="w-24 h-24 rounded-full mx-auto border-4 border-purple-100 shadow-lg"
            />
            <h3 className="text-xl font-semibold mt-4 text-gray-900">{member.name}</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Vote className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Template Vote</span>
              </div>
              <Badge variant="secondary" className="capitalize">
                {member.vote}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Joined At</span>
              </div>
              <span className="text-sm text-gray-600">
                {format(new Date(member.joinedAt), 'MMM dd, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Member ID</span>
              </div>
              <span className="text-xs font-mono text-gray-500">
                {member.id}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};