/** @jsx h */
import { ComponentChildren, h, JSX, RefObject } from 'preact'
import { useCallback, useRef, useState } from 'preact/hooks'

import menuStyles from '../../css/menu.css'
import { useClickOutside } from '../../hooks/use-click-outside'
import { useScrollableMenu } from '../../hooks/use-scrollable-menu'
import { OnValueChange, Props } from '../../types'
import { createClassName } from '../../utilities/create-class-name'
import { getCurrentFromRef } from '../../utilities/get-current-from-ref'
import { IconControlChevronDown8 } from '../icon/icon-8/icon-control-chevron-down-8'
import { IconMenuCheckmarkChecked16 } from '../icon/icon-16/icon-menu-checkmark-checked-16'
import dropdownStyles from './dropdown.css'

const INVALID_ID = null
const ITEM_ID_DATA_ATTRIBUTE_NAME = 'data-dropdown-item-id'

type Id = typeof INVALID_ID | string

export type DropdownProps<
  N extends string,
  V extends boolean | number | string = string
> = {
  disabled?: boolean
  icon?: ComponentChildren
  name?: N
  noBorder?: boolean
  onChange?: OmitThisParameter<JSX.GenericEventHandler<HTMLInputElement>>
  onValueChange?: OnValueChange<V, N>
  options: Array<DropdownOption<V>>
  placeholder?: string
  value: null | V
}
export type DropdownOption<V extends boolean | number | string = string> =
  | DropdownOptionHeader
  | DropdownOptionValue<V>
  | DropdownOptionSeparator
export type DropdownOptionHeader = {
  header: string
}
export type DropdownOptionValue<V> = {
  value: V
}
export type DropdownOptionSeparator = {
  separator: true
}

export function Dropdown<
  N extends string,
  V extends boolean | number | string = string
>({
  disabled = false,
  icon,
  name,
  noBorder,
  options,
  onChange = function () {},
  onValueChange = function () {},
  placeholder,
  value,
  ...rest
}: Props<HTMLDivElement, DropdownProps<N, V>>): JSX.Element {
  if (typeof icon === 'string' && icon.length !== 1) {
    throw new Error(`String \`icon\` must be a single character: ${icon}`)
  }

  const rootElementRef: RefObject<HTMLDivElement> = useRef(null)
  const menuElementRef: RefObject<HTMLDivElement> = useRef(null)

  const [isMenuVisible, setIsMenuVisible] = useState(false)

  const index = findOptionIndexByValue(options, value)
  if (value !== null && index === -1) {
    throw new Error(`Invalid \`value\`: ${value}`)
  }
  const [selectedId, setSelectedId] = useState<Id>(
    index === -1 ? null : `${index}`
  )

  // Uncomment to debug
  // console.table([{isMenuVisible, selectedId}])

  const {
    handleScrollableMenuKeyDown,
    handleScrollableMenuItemMouseMove
  } = useScrollableMenu({
    itemIdDataAttributeName: ITEM_ID_DATA_ATTRIBUTE_NAME,
    menuElementRef,
    selectedId: selectedId,
    setSelectedId: setSelectedId
  })

  const triggerBlur = useCallback(function (): void {
    setIsMenuVisible(false)
    setSelectedId(INVALID_ID)
    getCurrentFromRef(rootElementRef).blur()
  }, [])

  const handleRootFocus = useCallback(
    function (): void {
      // Show the menu and update the `selectedId` on focus
      setIsMenuVisible(true)
      if (value === null) {
        return
      }
      const index = findOptionIndexByValue(options, value)
      if (index === -1) {
        throw new Error(`Invalid \`value\`: ${value}`)
      }
      setSelectedId(`${index}`)
      // Re-position `menuElement` such that the currently-selected item is
      // directly above the dropdown UI
      const menuElement = getCurrentFromRef(menuElementRef)
      const selectedElement = menuElement.querySelector<HTMLInputElement>(
        `[${ITEM_ID_DATA_ATTRIBUTE_NAME}='${index}']`
      )
      if (selectedElement === null) {
        throw new Error('Invariant violation') // `index` is valid
      }
      const top =
        selectedElement.getBoundingClientRect().top -
        menuElement.getBoundingClientRect().top
      menuElement.style.top = `-${top}px`
    },
    [options, value]
  )

  const handleRootKeyDown = useCallback(
    function (event: JSX.TargetedKeyboardEvent<HTMLDivElement>): void {
      if (event.key === 'Escape') {
        triggerBlur()
        return
      }
      if (event.key === 'Enter') {
        if (selectedId !== INVALID_ID) {
          const selectedElement = getCurrentFromRef(
            menuElementRef
          ).querySelector<HTMLInputElement>(
            `[${ITEM_ID_DATA_ATTRIBUTE_NAME}='${selectedId}']`
          )
          if (selectedElement === null) {
            throw new Error('Invariant violation') // `selectedId` is valid
          }
          selectedElement.checked = true
          const changeEvent = document.createEvent('Event')
          changeEvent.initEvent('change', true, true)
          selectedElement.dispatchEvent(changeEvent)
        }
        triggerBlur()
        return
      }
      handleScrollableMenuKeyDown(event)
    },
    [handleScrollableMenuKeyDown, selectedId, triggerBlur]
  )

  const handleRootMouseDown = useCallback(
    function (event: JSX.TargetedMouseEvent<HTMLDivElement>): void {
      // `mousedown` events from `menuElement` are stopped from propagating to `rootElement` by `handleMenuMouseDown`
      if (isMenuVisible === false) {
        return
      }
      event.preventDefault()
      triggerBlur()
    },
    [isMenuVisible, triggerBlur]
  )

  const handleMenuMouseDown = useCallback(function (
    event: JSX.TargetedMouseEvent<HTMLDivElement>
  ): void {
    // Stop the `mousedown` event from propagating to the `rootElement`
    event.stopPropagation()
  },
  [])

  const handleOptionChange = useCallback(
    function (event: JSX.TargetedEvent<HTMLInputElement>): void {
      const id = event.currentTarget.getAttribute(
        ITEM_ID_DATA_ATTRIBUTE_NAME
      ) as string
      const optionValue = options[parseInt(id, 10)] as DropdownOptionValue<V>
      const newValue = optionValue.value
      onValueChange(newValue, name)
      onChange(event)
      triggerBlur()
    },
    [name, onChange, onValueChange, options, triggerBlur]
  )

  const handleClickOutside = useCallback(
    function (): void {
      if (isMenuVisible === false) {
        return
      }
      triggerBlur()
    },
    [isMenuVisible, triggerBlur]
  )
  useClickOutside({
    onClickOutside: handleClickOutside,
    ref: rootElementRef
  })

  return (
    <div
      {...rest}
      ref={rootElementRef}
      class={createClassName([
        dropdownStyles.dropdown,
        disabled === true ? dropdownStyles.disabled : null,
        noBorder === true ? dropdownStyles.noBorder : null
      ])}
      onFocus={handleRootFocus}
      onKeyDown={disabled === true ? undefined : handleRootKeyDown}
      onMouseDown={handleRootMouseDown}
      tabIndex={disabled === true ? -1 : 0}
    >
      {typeof icon === 'undefined' ? null : (
        <div class={dropdownStyles.icon}>{icon}</div>
      )}
      {value === null ? (
        typeof placeholder === 'undefined' ? null : (
          <div
            class={createClassName([
              dropdownStyles.value,
              dropdownStyles.placeholder
            ])}
          >
            {placeholder}
          </div>
        )
      ) : (
        <div class={dropdownStyles.value}>{value}</div>
      )}
      <div class={dropdownStyles.chevronIcon}>
        <IconControlChevronDown8 />
      </div>
      <div class={dropdownStyles.border} />
      <div
        ref={menuElementRef}
        class={createClassName([
          menuStyles.menu,
          disabled === true || isMenuVisible === false
            ? menuStyles.hidden
            : null
        ])}
        onMouseDown={handleMenuMouseDown}
      >
        {options.map(function (
          option: DropdownOption<V>,
          index: number
        ): JSX.Element {
          if ('separator' in option) {
            return <hr key={index} class={menuStyles.optionSeparator} />
          }
          if ('header' in option) {
            return (
              <h1 key={index} class={menuStyles.optionHeader}>
                {option.header}
              </h1>
            )
          }
          return (
            <label
              key={index}
              class={createClassName([
                menuStyles.optionValue,
                `${index}` === selectedId
                  ? menuStyles.optionValueSelected
                  : null
              ])}
            >
              <input
                checked={value === option.value}
                class={menuStyles.input}
                name={name}
                // If clicked on an unselected element, set the value
                onChange={
                  value === option.value ? undefined : handleOptionChange
                }
                // Else blur if clicked on an already-selected element
                onClick={value === option.value ? triggerBlur : undefined}
                onMouseMove={handleScrollableMenuItemMouseMove}
                tabIndex={-1}
                type="radio"
                value={`${option.value}`}
                {...{ [ITEM_ID_DATA_ATTRIBUTE_NAME]: `${index}` }}
              />
              {option.value === value ? (
                <div class={menuStyles.checkIcon}>
                  <IconMenuCheckmarkChecked16 />
                </div>
              ) : null}
              {option.value}
            </label>
          )
        })}
      </div>
    </div>
  )
}

// Returns the index of the option in `options` with the given `value`, else `-1`
function findOptionIndexByValue<V extends boolean | number | string = string>(
  options: Array<DropdownOption<V>>,
  value: null | V
): number {
  if (value === null) {
    return -1
  }
  let index = 0
  for (const option of options) {
    if ('value' in option && option.value === value) {
      return index
    }
    index += 1
  }
  return -1
}
