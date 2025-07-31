// // app/quick-study/outputs/viewers/components/MarkdownRenderer.tsx
// import React, { useMemo } from 'react'
// import ReactMarkdown from 'react-markdown'
// import remarkGfm from 'remark-gfm'
// import remarkMath from 'remark-math'
// import rehypeKatex from 'rehype-katex'
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
// import type { HoverHandlers } from '../hooks/useNotesHover'

// import 'katex/dist/katex.min.css'

// interface MarkdownRendererProps {
//   content: string
//   hoverHandlers: HoverHandlers
// }

// export function MarkdownRenderer({ content, hoverHandlers }: MarkdownRendererProps) {
//   // Optimized markdown components
//   const createMarkdownComponents = useMemo(() => ({
//     p: ({ node, children, ...props }: any) => {
//       const elementId = `p-${Math.random().toString(36).substr(2, 9)}`
//       const handlers = hoverHandlers.createHoverHandler('paragraph', '34, 197, 94')
      
//       return (
//         <p
//           id={elementId}
//           className="mb-4 leading-relaxed text-foreground cursor-pointer section-content-element relative"
//           {...handlers}
//           {...props}
//         >
//           {children}
//         </p>
//       )
//     },

//     ul: ({ node, children, ...props }: any) => {
//       const elementId = `ul-${Math.random().toString(36).substr(2, 9)}`
//       const handlers = hoverHandlers.createHoverHandler('unordered-list', '168, 85, 247')
      
//       return (
//         <ul
//           id={elementId}
//           className="list-disc list-inside space-y-2 mb-4 ml-4 cursor-pointer section-content-element relative"
//           {...handlers}
//           {...props}
//         >
//           {children}
//         </ul>
//       )
//     },

//     ol: ({ node, children, ...props }: any) => {
//       const elementId = `ol-${Math.random().toString(36).substr(2, 9)}`
//       const handlers = hoverHandlers.createHoverHandler('ordered-list', '250, 204, 21')
      
//       return (
//         <ol
//           id={elementId}
//           className="list-decimal list-inside space-y-2 mb-4 ml-4 cursor-pointer section-content-element relative"
//           {...handlers}
//           {...props}
//         >
//           {children}
//         </ol>
//       )
//     },

//     li: ({ node, children, ...props }: any) => (
//       <li className="text-foreground leading-relaxed" {...props}>
//         {children}
//       </li>
//     ),

//     table: ({ node, children, ...props }: any) => {
//       const elementId = `table-${Math.random().toString(36).substr(2, 9)}`
//       const handlers = hoverHandlers.createHoverHandler('table', '239, 68, 68')
      
//       return (
//         <div className="overflow-x-auto mb-6">
//           <table
//             id={elementId}
//             className="min-w-full border-collapse bg-background cursor-pointer section-content-element relative"
//             {...handlers}
//             {...props}
//           >
//             {children}
//           </table>
//         </div>
//       )
//     },

//     th: ({ node, children, ...props }: any) => (
//       <th
//         className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-left font-semibold text-foreground text-sm"
//         {...props}
//       >
//         {children}
//       </th>
//     ),

//     td: ({ node, children, ...props }: any) => (
//       <td
//         className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-foreground text-sm"
//         {...props}
//       >
//         {children}
//       </td>
//     ),

//     blockquote: ({ node, children, ...props }: any) => {
//       const elementId = `blockquote-${Math.random().toString(36).substr(2, 9)}`
//       const handlers = hoverHandlers.createHoverHandler('blockquote', '156, 163, 175')
      
//       return (
//         <blockquote
//           id={elementId}
//           className="border-l-4 border-gray-400 dark:border-gray-500 pl-4 py-2 mb-4 text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800/50 cursor-pointer section-content-element relative"
//           {...handlers}
//           {...props}
//         >
//           {children}
//         </blockquote>
//       )
//     },

//     code: ({ node, inline, className, children, ...props }: any) => {
//       const match = /language-(\w+)/.exec(className || '')
//       const language = match ? match[1] : ''

//       if (!inline && language) {
//         const elementId = `code-block-${Math.random().toString(36).substr(2, 9)}`
//         const handlers = hoverHandlers.createHoverHandler('code-block', '99, 102, 241')
        
//         return (
//           <div
//             id={elementId}
//             className="mb-4 cursor-pointer section-content-element relative"
//             {...handlers}
//           >
//             <SyntaxHighlighter
//               style={tomorrow}
//               language={language}
//               PreTag="div"
//               className="rounded-lg text-sm"
//               {...props}
//             >
//               {String(children).replace(/\n$/, '')}
//             </SyntaxHighlighter>
//           </div>
//         )
//       }

//       return (
//         <code
//           className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-foreground"
//           {...props}
//         >
//           {children}
//         </code>
//       )
//     },

//     strong: ({ node, children, ...props }: any) => (
//       <strong className="font-semibold text-foreground" {...props}>
//         {children}
//       </strong>
//     ),

//     em: ({ node, children, ...props }: any) => (
//       <em className="italic text-foreground" {...props}>
//         {children}
//       </em>
//     ),

//     a: ({ node, children, href, ...props }: any) => (
//       <a
//         href={href}
//         className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
//         target="_blank"
//         rel="noopener noreferrer"
//         {...props}
//       >
//         {children}
//       </a>
//     ),

//     hr: ({ node, ...props }: any) => (
//       <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
//     ),

//     h1: ({ node, children, ...props }: any) => (
//       <h1 className="text-3xl font-bold mb-6 mt-8 pb-3 border-b-2 border-gray-200 dark:border-gray-700 text-foreground" {...props}>
//         {children}
//       </h1>
//     ),

//     h2: ({ node, children, ...props }: any) => (
//       <h2 className="text-2xl font-bold mb-4 mt-8 text-foreground" {...props}>
//         {children}
//       </h2>
//     ),

//     h3: ({ node, children, ...props }: any) => (
//       <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground" {...props}>
//         {children}
//       </h3>
//     ),

//     h4: ({ node, children, ...props }: any) => (
//       <h4 className="text-lg font-semibold mb-3 mt-4 text-foreground border-b border-gray-200 dark:border-gray-700 pb-2" {...props}>
//         {children}
//       </h4>
//     ),

//     h5: ({ node, children, ...props }: any) => (
//       <h5 className="text-base font-semibold mb-2 mt-3 text-foreground" {...props}>
//         {children}
//       </h5>
//     ),

//     h6: ({ node, children, ...props }: any) => (
//       <h6 className="text-sm font-semibold mb-2 mt-3 text-foreground uppercase tracking-wide" {...props}>
//         {children}
//       </h6>
//     ),
//   }), [hoverHandlers])

//   return (
//     <div className="markdown-content text-sm text-foreground space-y-6">
//       <ReactMarkdown
//         remarkPlugins={[remarkGfm, remarkMath]}
//         rehypePlugins={[rehypeKatex]}
//         components={createMarkdownComponents}
//       >
//         {content}
//       </ReactMarkdown>
//     </div>
//   )
// }