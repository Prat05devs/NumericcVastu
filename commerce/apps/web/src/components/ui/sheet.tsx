'use client';
import * as React from 'react';
import {Dialog as SheetPrimitive} from 'radix-ui';
import {XIcon} from 'lucide-react';
import {cn} from '@/lib/utils';
function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) { return <SheetPrimitive.Root data-slot="sheet" {...props} />; }
function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) { return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />; }
function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) { return <SheetPrimitive.Close data-slot="sheet-close" {...props} />; }
function SheetContent({className, children, side = 'left', ...props}: React.ComponentProps<typeof SheetPrimitive.Content> & {side?: 'left' | 'right'}) {
  return <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[#1a1028]/40" />
    <SheetPrimitive.Content data-slot="sheet-content" className={cn('bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-200 data-[state=open]:duration-300 inset-y-0 h-full w-[86vw] max-w-[300px]', side === 'left' ? 'left-0 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left' : 'right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right', className)} {...props}>
      {children}
      <SheetPrimitive.Close className="absolute top-5 right-4 rounded-md p-1.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/40 outline-none cursor-pointer"><XIcon className="size-5" /><span className="sr-only">Close menu</span></SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>;
}
function SheetTitle({className, ...props}: React.ComponentProps<typeof SheetPrimitive.Title>) { return <SheetPrimitive.Title className={cn('sr-only', className)} {...props} />; }
function SheetDescription({className, ...props}: React.ComponentProps<typeof SheetPrimitive.Description>) { return <SheetPrimitive.Description className={cn('sr-only', className)} {...props} />; }
export {Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription};
