"use client"

import * as React from "react"
import { sl } from "react-day-picker/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const longDate = new Intl.DateTimeFormat("sl-SI", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

/** `yyyy-MM-dd` in local time, the shape our server actions parse. */
function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function fromIsoDate(value: string | undefined) {
  if (!value) return undefined
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function DatePicker({
  id,
  name,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Izberi datum",
  disabled,
  required,
  className,
  align = "start",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "value" | "defaultValue" | "onChange"> & {
  /** Name of the hidden input submitted with the surrounding form. */
  name?: string
  /** Uncontrolled initial date as `yyyy-MM-dd`. */
  defaultValue?: string
  /** Controlled date as `yyyy-MM-dd`. */
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  align?: React.ComponentProps<typeof PopoverContent>["align"]
}) {
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const current = value ?? internal
  const selected = fromIsoDate(current)

  function select(date: Date | undefined) {
    const next = date ? toIsoDate(date) : ""
    if (value === undefined) setInternal(next)
    onValueChange?.(next)
    if (date) setOpen(false)
  }

  return (
    <>
      {name ? (
        <input type="hidden" name={name} value={current} required={required} />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "h-9 w-full justify-between px-3 font-normal",
                !selected && "text-muted-foreground",
                className
              )}
              {...props}
            />
          }
        >
          {selected ? longDate.format(selected) : placeholder}
          <CalendarIcon className="size-4 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto p-0">
          <Calendar
            mode="single"
            locale={sl}
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            onSelect={select}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </>
  )
}

export { DatePicker, toIsoDate }
