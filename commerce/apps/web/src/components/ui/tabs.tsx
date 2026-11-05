'use client';
import * as React from 'react';
import {Tabs as TabsPrimitive} from 'radix-ui';
import {cn} from '@/lib/utils';
function Tabs({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-2', className)} {...props} />;
}
function TabsList({className, ...props}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn('inline-flex h-11 w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl border bg-white p-1', className)} {...props} />;
}
function TabsTrigger({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn('inline-flex h-full items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13.5px] font-bold whitespace-nowrap text-[#5c5569] transition-colors cursor-pointer hover:text-deep data-[state=active]:bg-secondary data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_0_0_1px_#ece3f7] focus-visible:ring-[3px] focus-visible:ring-ring/40 outline-none', className)} {...props} />;
}
function TabsContent({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
}
export {Tabs, TabsList, TabsTrigger, TabsContent};
