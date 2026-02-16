import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';

const manageGroupsPaths = [
  '/admin/manage-groups/ambassador-led',
  '/admin/manage-groups/direct',
  '/admin/manage-groups/group/',
];

function isManageGroupsActive(pathname: string) {
  return manageGroupsPaths.some(
    (p) => pathname === p || (p.endsWith('/') && pathname.startsWith(p))
  );
}

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [manageGroupsOpen, setManageGroupsOpen] = useState(isManageGroupsActive(pathname));

  const isDashboard = pathname === '/admin' || pathname === '/admin/';
  const isOrders = pathname === '/admin/order';
  const isAmbassadors = pathname.startsWith('/admin/ambassadors');
  const isColleges = pathname === '/admin/colleges';

  return (
    <aside className="sticky top-0 h-screen w-full md:w-64 shrink-0 overflow-y-auto rounded-r-xl p-4 bg-white border-r border-border space-y-1 text-foreground shadow-sm">
      {/* Branding */}
      <div className="flex items-center gap-3 pb-4 mb-2 border-b border-border">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#BA68C8] to-[#F06292] text-lg font-bold text-white shadow-md">
          S
        </div>
        <div className="min-w-0">
          <div className="font-bold text-foreground truncate">Signatureday</div>
          <div className="text-xs text-muted-foreground truncate">Admin Dashboard</div>
        </div>
      </div>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-2 pt-2 pb-1">MAIN MENU</h2>
      <Button
        variant="ghost"
        className={`w-full justify-start rounded-lg text-foreground hover:bg-muted hover:text-foreground ${isDashboard ? 'bg-muted' : ''}`}
        onClick={() => navigate('/admin')}
      >
        <LayoutDashboard className="h-4 w-4 mr-2" />
        Dashboard
      </Button>
      <Button
        variant="ghost"
        className={`w-full justify-start rounded-lg text-foreground hover:bg-muted hover:text-foreground ${isOrders ? 'bg-muted' : ''}`}
        onClick={() => navigate('/admin/order')}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        Manage Orders
      </Button>
      <Button
        variant="ghost"
        className={`w-full justify-start rounded-lg text-foreground hover:bg-muted hover:text-foreground ${isAmbassadors ? 'bg-muted' : ''}`}
        onClick={() => navigate('/admin/ambassadors')}
      >
        <Users className="h-4 w-4 mr-2" />
        Manage Ambassadors
      </Button>
      <Button
        variant="ghost"
        className={`w-full justify-start rounded-lg text-foreground hover:bg-muted hover:text-foreground ${isColleges ? 'bg-muted' : ''}`}
        onClick={() => navigate('/admin/colleges')}
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        College Insights
      </Button>

      <Collapsible open={manageGroupsOpen} onOpenChange={setManageGroupsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-between rounded-lg text-foreground hover:bg-muted hover:text-foreground ${isManageGroupsActive(pathname) ? 'bg-muted' : ''}`}
          >
            <span className="flex items-center">
              <UsersRound className="h-4 w-4 mr-2" />
              Manage Groups
            </span>
            {manageGroupsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 pl-2 space-y-1 border-l border-border ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-md font-normal text-foreground hover:bg-muted hover:text-foreground"
              onClick={() => navigate('/admin/manage-groups/ambassador-led')}
            >
              Ambassador Group
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-md font-normal text-foreground hover:bg-muted hover:text-foreground"
              onClick={() => navigate('/admin/manage-groups/direct')}
            >
              User Created Group
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}
