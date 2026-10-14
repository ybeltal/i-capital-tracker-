import { getTeamAvatar } from './pipelineConfig'

export default function UserAvatar({ name, size = 24, style = {} }) {
  const avatarUrl = getTeamAvatar(name)
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Team member'}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          if (e.currentTarget.nextSibling) {
            e.currentTarget.nextSibling.style.display = 'inline-flex'
          }
        }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1.5px solid #ffffff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          verticalAlign: 'middle',
          flexShrink: 0,
          display: 'inline-block',
          ...style,
        }}
      />
    )
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#e2e8f0',
        color: '#475569',
        fontSize: Math.max(10, Math.floor(size * 0.45)),
        fontWeight: 700,
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    >
      {initial}
    </span>
  )
}