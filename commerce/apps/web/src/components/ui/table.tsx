import * as React from 'react';
import {cn} from '@/lib/utils';

/** On phones each row becomes a card; cells show their column name from data-label. */
function Table({className, ...props}: React.ComponentProps<'table'>) {
  return <div data-slot="table-container" className="relative w-full overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgba(42,16,70,.04),0_8px_24px_-12px_rgba(42,16,70,.12)] max-md:overflow-visible max-md:border-0 max-md:bg-transparent max-md:shadow-none"><table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} /></div>;
}
function TableHeader({className, ...props}: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('bg-[#fbf9fd] [&_tr]:border-b max-md:hidden', className)} {...props} />;
}
function TableBody({className, ...props}: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0 max-md:block', className)} {...props} />;
}
function TableRow({className, ...props}: React.ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={cn('border-b transition-colors hover:bg-[#fdfcff] max-md:mb-3 max-md:block max-md:rounded-2xl max-md:border max-md:bg-card max-md:px-4 max-md:py-1 max-md:shadow-[0_8px_24px_-12px_rgba(42,16,70,.12)]', className)} {...props} />;
}
function TableHead({className, ...props}: React.ComponentProps<'th'>) {
  return <th data-slot="table-head" className={cn('text-muted-foreground h-11 px-4 text-left align-middle text-[11.5px] font-extrabold tracking-wider uppercase whitespace-nowrap', className)} {...props} />;
}
function TableCell({className, label, children, ...props}: React.ComponentProps<'td'> & {label?: string}) {
  return <td data-slot="table-cell" data-label={label} className={cn('p-4 align-top max-md:grid max-md:grid-cols-[92px_minmax(0,1fr)] max-md:gap-3 max-md:border-b max-md:border-dashed max-md:px-0 max-md:py-2.5 max-md:last:border-0 max-md:before:pt-0.5 max-md:before:text-[11px] max-md:before:font-extrabold max-md:before:tracking-wider max-md:before:text-muted-foreground max-md:before:uppercase max-md:before:content-[attr(data-label)]', className)} {...props}><div className="min-w-0">{children}</div></td>;
}
export {Table, TableHeader, TableBody, TableHead, TableRow, TableCell};
