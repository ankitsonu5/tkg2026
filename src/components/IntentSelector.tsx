'use client'

import { useMemo, useState } from 'react'

import type { BaselineInquiryRoute } from '@/baseline/inquiry-routes'
import { InquiryForm } from './InquiryForm'

/**
 * Intent selector (MOD-CONNECT-INTENT-SELECTOR).
 *
 * Progressive disclosure: the route-specific qualification fields only appear once an intent
 * is chosen, so a visitor is never shown a wall of fields they do not need to answer.
 */
export function IntentSelector({
  routes,
  initialRouteId,
  acceptance,
}: {
  routes: BaselineInquiryRoute[]
  initialRouteId?: string
  acceptance: Record<string, string>
}) {
  const [selected, setSelected] = useState<string | undefined>(
    initialRouteId && routes.some((r) => r.routeId === initialRouteId) ? initialRouteId : undefined,
  )

  const route = useMemo(() => routes.find((r) => r.routeId === selected), [routes, selected])

  return (
    <div>
      <fieldset className="field">
        <legend>
          <strong>What is your inquiry about?</strong>
        </legend>
        {routes.map((r) => (
          <div className="field field--checkbox" key={r.routeId}>
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

      {route && (
        <>
          {acceptance[route.routeId] !== 'accepted' && (
            <div className="notice">
              <p className="notice__title">This route is not yet accepted for production</p>
              <p>
                A named owner and backup have not been confirmed for the {route.ownerRole} route. In this environment
                messages are captured locally and are not sent to a real recipient.
              </p>
            </div>
          )}
          <InquiryForm route={route} />
        </>
      )}
    </div>
  )
}
