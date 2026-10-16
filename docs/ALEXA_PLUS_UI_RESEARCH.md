# Alexa+ inspired Market Partner interface

## Research summary

This interface is a browser-based simulation inspired by Alexa+ add-on guidance. It is not an official Alexa+ client and does not use Amazon's private Alexa+ runtime.

Amazon's current add-on design guidance describes voice responses, inline components, and optional full-screen views as parts of one conversation. It recommends completing the user's task within that conversation, keeping metadata glanceable, using text that can be read from across a room, and retaining the host's visual language. The guidance also recommends large type, reduced content density, and cards with one clear purpose. See the [Alexa+ add-on design introduction](https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-addon-design-guide-overview) and [visual foundations](https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-addon-visual-foundations).

The component guide describes a horizontal carousel as a suitable pattern for related items, including stocks, and recommends showing three to five items in an inline result. It describes cards as a way to focus on one entity and reserve call-to-action buttons for steps that move a task forward. See [Alexa+ components and patterns](https://www.developer.amazon.com/docs/alexaplus/add-ons/mcp-addon-components-and-patterns). Amazon's Echo Show shopping experience also combines voice and touch, larger text and buttons, comparison, and a visible purchase flow; see [Amazon's Alexa+ shopping experience](https://www.aboutamazon.com/news/devices/echo-show-alexa-plus-shopping).

## Product decisions applied here

- The assistant has a visible voice state, a tap-to-talk orb, a conversation transcript, typed input, and spoken replies.
- The interface uses a restrained blue accent, large touch targets, short labels, rounded cards, and a quieter outer canvas. Market Partner keeps its own name and identity instead of presenting itself as an official Amazon surface.
- Four fictional demo securities appear as a compact stock list. The UI does not invent live prices or charts; the dataset contains no live quote feed.
- A paper order can be prepared from the conversation or dictated into the editable ticket. Dictation only fills fields. It does not create a preview or submit an order.
- Every order preview displays the security, side, quantity, account, limit price, estimated total, mode, and expiry. A separate checkbox and button confirm the exact simulation. The assistant cannot confirm an order through tool calling.
- The current environment uses synthetic securities and a local paper simulator. It has no live brokerage order path.

## Voice order example

“Preview a paper buy of 2 NORTHSTAR at 1500 rupees in Sample Account A.”

Market Partner prepares a preview from those explicit terms. The user reviews the visible terms and confirms separately. The speech recognizer only supplies a transcript; the server receives the transcript for assistant requests, while the standalone trade-ticket dictation fills editable form fields locally.
