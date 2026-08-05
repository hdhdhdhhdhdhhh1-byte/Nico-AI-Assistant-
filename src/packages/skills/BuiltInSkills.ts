import type { Skill } from "../shared/types";
import { WeatherSkill } from "./builtin/WeatherSkill";
import { CalendarSkill } from "./builtin/CalendarSkill";
import { ReminderSkill } from "./builtin/ReminderSkill";
import { SearchSkill } from "./builtin/SearchSkill";
import { SmartHomeSkill } from "./builtin/SmartHomeSkill";
import { MemorySkill } from "./builtin/MemorySkill";
import { NotesSkill } from "./builtin/NotesSkill";
import { PhoneSkill } from "./builtin/PhoneSkill";
import { MessageSkill } from "./builtin/MessageSkill";
import { AppLauncherSkill } from "./builtin/AppLauncherSkill";
import { TimeSkill } from "./builtin/TimeSkill";

export function builtInSkills(): Skill[] {
  return [
    WeatherSkill,
    CalendarSkill,
    ReminderSkill,
    NotesSkill,
    SearchSkill,
    SmartHomeSkill,
    MemorySkill,
    PhoneSkill,
    MessageSkill,
    AppLauncherSkill,
    TimeSkill,
  ];
}

export {
  WeatherSkill,
  CalendarSkill,
  ReminderSkill,
  NotesSkill,
  SearchSkill,
  SmartHomeSkill,
  MemorySkill,
  PhoneSkill,
  MessageSkill,
  AppLauncherSkill,
  TimeSkill,
};
