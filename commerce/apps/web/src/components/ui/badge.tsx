import * as React from 'react';
import {Slot} from 'radix-ui';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-extrabold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3', {
  variants: {
    variant: {
      default: 'border-transparent bg-secondary text-primary',
      success: 'border-transparent bg-[#e7f6ee] text-success',
      destructive: 'border-transparent bg-[#fdecef] text-destructive',
      warning: 'border-transparent bg-[#fff3d6] text-warning',
      muted: 'border-transparent bg-muted text-muted-foreground',
      outline: 'text-foreground',
      sindoor: 'border-transparent bg-sindoor text-white',
    },
  },
  defaultVariants: {variant: 'default'},
});
function Badge({className, variant, asChild = false, dot = false, children, ...props}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & {asChild?: boolean; dot?: boolean}) {
  const Comp = asChild ? Slot.Root : 'span';
  return <Comp data-slot="badge" className={cn(badgeVariants({variant}), className)} {...props}>{dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}{children}</Comp>;
}
export {Badge, badgeVariants};
