import * as React from 'react';
import {cn} from '@/lib/utils';
function Input({className, type, ...props}: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn('placeholder:text-muted-foreground border-input h-10 w-full min-w-0 rounded-lg border bg-white px-3 py-1 text-[15px] shadow-xs transition-[color,box-shadow] outline-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:ring-[4px] aria-invalid:border-destructive', className)} {...props} />;
}
export {Input};
