import {
  BookOpen,
  Briefcase,
  Car,
  Crown,
  Eye,
  FileText,
  Flame,
  Folder,
  Gavel,
  HeartPulse,
  Landmark,
  Lightbulb,
  MapPin,
  MessageSquare,
  Music,
  PartyPopper,
  Radio,
  Scale,
  Shield,
  Siren,
  Skull,
  Sparkles,
  Star,
  Swords,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  landmark: Landmark,
  skull: Skull,
  siren: Siren,
  car: Car,
  eye: Eye,
  swords: Swords,
  'heart-pulse': HeartPulse,
  radio: Radio,
  scale: Scale,
  flame: Flame,
  'book-open': BookOpen,
  'message-square': MessageSquare,
  sparkles: Sparkles,
  'party-popper': PartyPopper,
  users: Users,
  briefcase: Briefcase,
  gavel: Gavel,
  truck: Truck,
  wrench: Wrench,
  star: Star,
  crown: Crown,
  'map-pin': MapPin,
  music: Music,
  lightbulb: Lightbulb,
}

export function NodeIcon({
  icon,
  kind,
  className,
}: {
  icon: string
  kind: 'section' | 'topic'
  className?: string
}) {
  const Icon = ICONS[icon] ?? (kind === 'section' ? Folder : FileText)
  return <Icon aria-hidden className={className} />
}
