'use client';
import * as React from 'react';
import {Command as CommandPrimitive} from 'cmdk';
import {SearchIcon} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from './dialog';

function Command({className, ...props}: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive data-slot="command" className={cn('flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground', className)} {...props} />;
}
function CommandDialog({title = 'Search the back office', description = 'Type to find a page', children, ...props}: React.ComponentProps<typeof Dialog> & {title?: string; description?: string}) {
  return <Dialog {...props}><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription><DialogContent className="overflow-hidden p-0"><Command>{children}</Command></DialogContent></Dialog>;
}
function CommandInput({className, ...props}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return <div className="flex h-12 items-center gap-2 border-b px-4"><SearchIcon className="size-4 shrink-0 opacity-50" /><CommandPrimitive.Input data-slot="command-input" className={cn('flex h-10 w-full bg-transparent py-3 text-[15px] outline-none placeholder:text-muted-foreground', className)} {...props} /></div>;
}
function CommandList({className, ...props}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List data-slot="command-list" className={cn('max-h-[360px] scroll-py-1 overflow-x-hidden overflow-y-auto p-1.5', className)} {...props} />;
}
function CommandEmpty(props: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" className="py-6 text-center text-sm text-muted-foreground" {...props} />;
}
function CommandGroup({className, ...props}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return <CommandPrimitive.Group data-slot="command-group" className={cn('overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-extrabold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase', className)} {...props} />;
}
function CommandItem({className, ...props}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return <CommandPrimitive.Item data-slot="command-item" className={cn("relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold outline-none select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-muted-foreground", className)} {...props} />;
}
export {Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem};
