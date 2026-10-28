'use client'

import { useMemo, useState } from 'react'

import type { BaselineInquiryRoute } from '@/baseline/inquiry-routes'
import { InquiryForm } from './InquiryForm'

/**
 * Intent selector (MOD-CONNECT-INTENT-SELECTOR).
 *
 * Side-by-side progressive disclosure: the left column shows the route choices,
 * and the right column reveals the route-specific form when an intent is selected.
 */
export function IntentSelector({
  routes,
  initialRouteId,
  productionReady,
}: {
  routes: BaselineInquiryRoute[]
  initialRouteId?: string
  productionReady: Record<string, boolean>
}) {
  const defaultRouteId =
    initialRouteId && routes.some((r) => r.routeId === initialRouteId)
      ? initialRouteId
      : routes.some((r) => r.routeId === 'general')
        ? 'general'
        : routes[0]?.routeId

  const [selected, setSelected] = useState<string | undefined>(defaultRouteId)

  const route = useMemo(() => routes.find((r) => r.routeId === selected), [routes, selected])

  return (
    <div className="connect-split">
      {/* ── Left column: inquiry type picker ── */}
      <div className="connect-split__picker">
        <fieldset className="field">
          <legend>
            <strong>What is your inquiry about?</strong>
          </legend>
          {routes.map((r) => (
            <div
              className={`field field--checkbox connect-split__option${selected === r.routeId ? ' connect-split__option--active' : ''}`}
              key={r.routeId}
            >
              <input
                type="radio"
                id={`intent-${r.routeId}`}
                name="intent"
                value={r.routeId}
                checked={selected === r.routeId}
                onChange={() => setSelected(r.routeId)}
              />
              <label htmlFor={`intent-${r.routeId}`}>
                {r.label}
                <span className="field__purpose">
                  {r.minimumQualification}. Response within {r.slaHours} hours.
                </span>
              </label>
            </div>
          ))}
        </fieldset>
      </div>

      {/* ── Right column: form appears on selection ── */}
      <div className={`connect-split__form${route ? ' connect-split__form--visible' : ''}`}>
        {route && (
          <div className="connect-split__form-inner" key={route.routeId}>
            {!productionReady[route.routeId] && (
              <div className="notice">
                <p className="notice__title">This route is not yet accepted for production</p>
                <p>
                  A named owner and backup have not been confirmed for the {route.ownerRole} route. In this environment
                  messages are captured locally and are not sent to a real recipient.
                </p>
              </div>
            )}
            <InquiryForm route={route} />
          </div>
        )}
      </div>
    </div>
  )
}
